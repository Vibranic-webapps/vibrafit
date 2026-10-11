/**
 * Runs one workout on screen: which step we're on, the rest clock, logging a
 * set, pain/skip, finishing, keeping the screen awake, and the spoken
 * announcements. The page only draws what this returns.
 *
 * The draft (useWorkoutDraft) is the single source of truth. "Where am I?" is
 * derived from the logged sets, so reloading mid-workout lands in the right
 * place. Every set goes to the sync queue BEFORE the draft changes
 * (non-negotiable #6), and the queue works without a network.
 */
import {
  currentPosition,
  doneExerciseCount,
  lastLoggedSet,
  loggedSets,
  makeSet,
  prefillAmount,
  segmentsOf,
  sessionOf,
  setsOf,
  summarise,
  upsertSet,
} from '~/utils/workoutDraft'
import type { Feeling, SetRecord } from '~/utils/workoutTypes'

type LoadStatus = 'loading' | 'ready' | 'notFound' | 'error'

export function useWorkoutRun(clientId: string) {
  const { t } = useI18n()
  const store = useWorkoutDraft()
  const queue = useSetQueue()
  const text = useWorkoutText()
  const sync = useSyncStatus()

  const status = ref<LoadStatus>('loading')
  const draft = computed(() => store.get(clientId))

  // --- Where am I? ------------------------------------------------------------
  const position = computed(() => (draft.value ? currentPosition(draft.value) : null))
  /** The logged set being corrected ("Fix"), if any. */
  const fixing = ref<SetRecord | null>(null)

  const exercise = computed(() => {
    const d = draft.value
    if (!d) return null
    if (fixing.value) return d.exercises.find((e) => e.slug === fixing.value?.exerciseSlug) ?? null
    return position.value ? (d.exercises[position.value.exerciseIndex] ?? null) : null
  })
  const setNumber = computed(() => fixing.value?.setNumber ?? position.value?.setNumber ?? 1)

  /** What the Pain / Skip sheet acts on: the exercise that's current, or up next during rest. */
  const sheetExercise = computed(() => {
    const d = draft.value
    return d && position.value ? (d.exercises[position.value.exerciseIndex] ?? null) : null
  })

  const view = computed<'log' | 'rest' | 'summary' | null>(() => {
    const d = draft.value
    if (!d) return null
    if (d.finishedAt) return 'summary'
    if (fixing.value) return 'log'
    return d.rest ? 'rest' : 'log'
  })

  const loggedNumbers = computed(() => {
    const d = draft.value
    const ex = exercise.value
    if (!d || !ex) return []
    return setsOf(d, ex.slug).filter((s) => !s.skippedForPain).map((s) => s.setNumber)
  })

  const initialAmount = computed(() => {
    if (fixing.value?.amount != null) return fixing.value.amount
    return draft.value && exercise.value ? prefillAmount(draft.value, exercise.value) : 0
  })

  const segments = computed(() => (draft.value ? segmentsOf(draft.value) : []))
  const exerciseNumber = computed(() => (position.value ? position.value.exerciseIndex + 1 : (draft.value?.exercises.length ?? 0)))
  const loggedCount = computed(() => (draft.value ? loggedSets(draft.value).length : 0))
  const summary = computed(() => (draft.value ? summarise(draft.value) : null))
  const showPainNotice = computed(() => {
    const d = draft.value
    if (!d || d.painNoticeIndex === null || !position.value) return false
    const ex = d.exercises[d.painNoticeIndex]
    return position.value.exerciseIndex === d.painNoticeIndex && !!ex && setsOf(d, ex.slug).length === 0
  })

  // --- Announcements (one polite live region) -------------------------------------
  const announcement = ref('')
  function announce(message: string) {
    // Clear first so the same sentence twice in a row is still read out.
    announcement.value = ''
    void nextTick(() => (announcement.value = message))
  }

  function announceExercise() {
    const d = draft.value
    const pos = position.value
    const ex = pos ? d?.exercises[pos.exerciseIndex] : null
    if (!d || !pos || !ex) return
    announce(
      t('announce.exercise', { n: pos.exerciseIndex + 1, total: d.exercises.length, name: text.name(ex), sets: ex.sets })
    )
  }

  // --- Rest clock (from timestamps, so a locked screen can't skew it) --------------
  const now = ref(Date.now())
  const rest = computed(() => draft.value?.rest ?? null)
  const restRemaining = computed(() => (rest.value ? Math.max(0, Math.ceil((rest.value.endsAt - now.value) / 1000)) : 0))
  let ticker: ReturnType<typeof setInterval> | undefined
  const milestones = { warned: false, over: false }

  watch(
    () => rest.value !== null,
    (active) => {
      clearInterval(ticker)
      if (!active) return
      now.value = Date.now()
      ticker = setInterval(() => (now.value = Date.now()), 250)
    },
    { immediate: true }
  )

  // New or extended rest: re-arm the milestones (an already-finished rest restored after a reload stays quiet).
  watch(
    () => rest.value?.endsAt,
    (endsAt) => {
      if (endsAt === undefined) return
      const remaining = Math.ceil((endsAt - Date.now()) / 1000)
      milestones.warned = remaining <= REST_WARNING_SECONDS
      milestones.over = remaining <= 0
    },
    { immediate: true }
  )

  watch(restRemaining, (remaining) => {
    if (!rest.value) return
    if (remaining > 0 && remaining <= REST_WARNING_SECONDS && !milestones.warned) {
      milestones.warned = true
      announce(t('announce.tenLeft'))
    }
    if (remaining <= 0 && !milestones.over) {
      milestones.over = true
      vibrate(HAPTIC_REST_OVER_MS)
      const d = draft.value
      if (d && position.value) {
        announce(t('announce.restOver', { n: position.value.setNumber, total: exercise.value?.sets ?? 0 }))
      }
    }
  })

  function vibrate(ms: number) {
    if (import.meta.client && 'vibrate' in navigator) navigator.vibrate(ms)
  }

  // --- Loading --------------------------------------------------------------------
  async function load() {
    status.value = 'loading'
    try {
      const d = await store.ensure(clientId)
      if (!d) {
        status.value = 'notFound'
        return
      }
      status.value = 'ready'
      // Every set done but never finished (the app was closed in between): finish it now.
      if (!d.finishedAt && !currentPosition(d)) store.finish(clientId)
    } catch {
      status.value = 'error'
    }
  }

  // --- Actions --------------------------------------------------------------------
  function logSet(amount: number, feeling: Feeling | null) {
    const d = draft.value
    const ex = exercise.value
    if (!d || !ex) return
    now.value = Date.now()
    const editing = fixing.value
    const set = makeSet({
      clientId: editing?.clientId ?? newId(),
      draft: d,
      exercise: ex,
      setNumber: setNumber.value,
      amount,
      feeling,
      skippedForPain: false,
      loggedAt: editing?.loggedAt ?? new Date().toISOString(),
    })

    // 1. On the phone's queue first, then the UI. The network is never awaited.
    queue.enqueueSet(sessionOf(d), set)
    vibrate(HAPTIC_LOG_MS)

    // Correcting an earlier set: replace it under the same id, then back to the rest screen.
    if (editing) {
      fixing.value = null
      store.mutate(clientId, (draft) => upsertSet(draft, set))
      return
    }

    const seconds = restSecondsFor(ex)
    const updated = store.mutate(clientId, (draft) => {
      upsertSet(draft, set)
      const startedAt = Date.now()
      draft.rest = { endsAt: startedAt + seconds * 1000, total: seconds, startedAt }
    })
    if (updated && !currentPosition(updated)) {
      store.finish(clientId) // that was the last set: straight to the summary, no rest
      return
    }
    announce(t('announce.logged', { n: set.setNumber, time: text.spokenTime(seconds) }))
  }

  function endRest() {
    const lastSlug = draft.value ? lastLoggedSet(draft.value)?.exerciseSlug : undefined
    store.mutate(clientId, (d) => {
      d.rest = null
    })
    if (exercise.value && exercise.value.slug !== lastSlug) announceExercise()
  }

  /** Primary button on the rest screen: "Skip rest", or "Start set N" once rest is over. */
  function restPrimary() {
    const r = rest.value
    if (!r) return
    // A double-tap on "Log set" would otherwise skip the rest the moment it appears.
    if (restRemaining.value > 0 && Date.now() - r.startedAt < SKIP_REST_GUARD_MS) return
    endRest()
  }

  function addRestTime() {
    now.value = Date.now()
    store.mutate(clientId, (d) => {
      const r = d.rest
      if (!r) return
      if (r.endsAt <= Date.now()) {
        // Rest was over: +15 s starts a fresh 15 s.
        r.endsAt = Date.now() + REST_EXTEND_SECONDS * 1000
        r.total = REST_EXTEND_SECONDS
      } else {
        r.endsAt += REST_EXTEND_SECONDS * 1000
        r.total += REST_EXTEND_SECONDS
      }
    })
  }

  function startFix() {
    const d = draft.value
    const last = d ? lastLoggedSet(d) : null
    if (last) fixing.value = last
  }

  function cancelFix() {
    fixing.value = null
  }

  /** After skip / pain: next exercise in its log state, or the summary if that was the last. */
  function afterLeavingExercise() {
    fixing.value = null
    const d = draft.value
    if (d && !currentPosition(d)) store.finish(clientId)
    else announceExercise()
  }

  function skipExercise() {
    const ex = sheetExercise.value
    if (!ex) return
    store.mutate(clientId, (d) => {
      if (!d.skipped.includes(ex.slug)) d.skipped.push(ex.slug)
      d.rest = null
    })
    afterLeavingExercise()
  }

  /** Pain: a set with skippedForPain, no amount. The exercise's remaining sets are dropped. */
  function stopForPain() {
    const d = draft.value
    const pos = position.value
    const ex = sheetExercise.value
    if (!d || !pos || !ex) return
    const set = makeSet({
      clientId: newId(),
      draft: d,
      exercise: ex,
      setNumber: pos.setNumber,
      amount: null,
      feeling: null,
      skippedForPain: true,
      loggedAt: new Date().toISOString(),
    })
    queue.enqueueSet(sessionOf(d), set)
    store.mutate(clientId, (draft) => {
      upsertSet(draft, set)
      draft.rest = null
      draft.painNoticeIndex = currentPosition(draft)?.exerciseIndex ?? null
    })
    afterLeavingExercise()
  }

  function finishNow() {
    fixing.value = null
    store.finish(clientId)
  }

  // --- Leaving (X button and the browser back gesture) -----------------------------
  const leaveOpen = ref(false)
  const painOpen = ref(false)
  let allowLeave = false

  onBeforeRouteLeave(() => {
    const d = draft.value
    if (allowLeave || !d || d.finishedAt) return true
    leaveOpen.value = true
    return false
  })

  async function goToday() {
    allowLeave = true
    await navigateTo('/')
  }

  // --- Keep the screen awake while a workout is running ------------------------------
  let wakeLock: WakeLockSentinel | null = null
  const active = computed(() => status.value === 'ready' && !!draft.value && !draft.value.finishedAt)

  async function acquireWakeLock() {
    if (!import.meta.client || !('wakeLock' in navigator)) return
    if (wakeLock && !wakeLock.released) return
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch {
      // Refused (low battery, background tab): the workout works fine without it.
    }
  }

  function releaseWakeLock() {
    void wakeLock?.release().catch(() => {})
    wakeLock = null
  }

  watch(active, (isActive) => (isActive ? void acquireWakeLock() : releaseWakeLock()))

  function onVisible() {
    if (document.visibilityState === 'visible' && active.value) void acquireWakeLock()
  }

  // --- Focus follows the step (screen readers start at the new heading) -----------------
  const stepKey = computed(() => `${view.value}:${exercise.value?.slug}:${setNumber.value}:${fixing.value?.clientId ?? ''}`)
  watch(stepKey, async () => {
    if (status.value !== 'ready') return
    await nextTick()
    document.querySelector<HTMLElement>('[data-wk-focus]')?.focus({ preventScroll: false })
  })

  // Save status: say it when things go offline or fail (not on every change).
  let syncTimer: ReturnType<typeof setTimeout> | undefined
  watch(sync.state, (state) => {
    clearTimeout(syncTimer)
    const waiting = sync.pendingSets.value
    if ((state === 'offline' || state === 'failed') && waiting > 0) {
      syncTimer = setTimeout(() => announce(t('announce.savedLocal', { n: waiting }, waiting)), 1500)
    }
  })

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisible)
    if (active.value) void acquireWakeLock()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(ticker)
    clearTimeout(syncTimer)
    releaseWakeLock()
  })

  return {
    status,
    draft,
    view,
    exercise,
    setNumber,
    loggedNumbers,
    initialAmount,
    fixing,
    segments,
    exerciseNumber,
    loggedCount,
    summary,
    showPainNotice,
    sheetExercise,
    rest,
    restRemaining,
    announcement,
    leaveOpen,
    painOpen,
    doneExercises: computed(() => (draft.value ? doneExerciseCount(draft.value) : 0)),
    lastLogged: computed(() => (draft.value ? lastLoggedSet(draft.value) : null)),
    position,
    load,
    logSet,
    restPrimary,
    addRestTime,
    startFix,
    cancelFix,
    skipExercise,
    stopForPain,
    finishNow,
    goToday,
    announce,
  }
}
