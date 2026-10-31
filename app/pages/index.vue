<script setup lang="ts">
/**
 * Today: what to do now. One primary card whose content depends on where the
 * user is: no equipment, no program, ready, in progress, finished.
 *
 * The phone's own data wins over the server's: a workout started or finished
 * on this phone is shown even if the server hasn't heard yet, and the last
 * program is cached so a workout can start with no connection.
 */
import { brusselsDate } from '~~/shared/utils/brusselsDate'
import { doneExerciseCount, loggedSets, segmentsOf } from '~/utils/workoutDraft'
import type { ProgramDay, ProgramDto, TodayDto } from '~/utils/workoutTypes'

definePageMeta({ layout: 'tabs' })

const { t, localeProperties } = useI18n()
useHead({ title: computed(() => t('today.title')) })

const cache = useOfflineCache()
const drafts = useWorkoutDraft()
const queue = useSetQueue()

// Plain string (not a path literal) keeps TS away from Nitro's typed route map.
const GENERATE_URL: string = '/api/program/generate'

// --- Loading ---------------------------------------------------------------------
type Phase = 'loading' | 'ready' | 'error'
const phase = ref<Phase>('loading')
const today = ref<TodayDto | null>(null)
const program = ref<ProgramDto | null>(null)
/** The answer came from the phone's memory because the server could not be reached. */
const fromCache = ref(false)
const mounted = ref(false)

async function load() {
  if (!today.value) phase.value = 'loading'
  const [todayResult, programResult] = await Promise.allSettled([cache.fetchToday(), cache.fetchProgram()])

  fromCache.value = todayResult.status === 'rejected'
  program.value = programResult.status === 'fulfilled' ? programResult.value : cache.readProgram()

  if (todayResult.status === 'fulfilled') {
    today.value = todayResult.value
  } else {
    const cached = cache.readToday()
    if (cached && cached.date === brusselsDate()) {
      today.value = cached
    } else if (cached) {
      // A new day: yesterday's in-progress / finished flags no longer apply.
      today.value = { ...cached, date: brusselsDate(), inProgress: null, finishedToday: null }
    } else if (program.value?.days.length) {
      today.value = {
        date: brusselsDate(),
        hasEquipment: true,
        hasProgram: true,
        nextDayKey: program.value.days[0]?.key ?? null,
        inProgress: null,
        finishedToday: null,
      }
    } else {
      today.value = null
    }
  }

  if (!today.value) {
    phase.value = 'error'
    return
  }

  // A workout the server knows about but this phone doesn't (other device, cleared storage).
  if (!fromCache.value) {
    for (const known of [today.value.inProgress, today.value.finishedToday]) {
      if (known && !drafts.get(known.clientId)) await drafts.ensure(known.clientId).catch(() => null)
    }
  }
  phase.value = 'ready'
}

onMounted(() => {
  mounted.value = true
  void load()
})

// Back on the page after a sync (e.g. Resume -> finish -> back): pick up the server's view.
watch(
  () => queue.hasPending.value,
  (pending, wasPending) => {
    if (wasPending && !pending && phase.value === 'ready') void load()
  }
)

// --- What to show --------------------------------------------------------------------
const openDraft = computed(() => drafts.openDraft())
const finishedDraft = computed(() => drafts.finishedOn(today.value?.date ?? brusselsDate()))

const hasProgram = computed(() => !!today.value?.hasProgram && !!program.value?.days.length)

type View = 'progress' | 'done' | 'noEquipment' | 'noProgram' | 'ready'
const view = computed<View | null>(() => {
  const td = today.value
  if (!td) return null
  const serverOpen = td.inProgress && !drafts.get(td.inProgress.clientId)?.finishedAt
  if (openDraft.value || serverOpen) return 'progress'
  // The server's finishedToday can be a workout closed with nothing logged: that isn't training.
  if (finishedDraft.value || (td.finishedToday && td.finishedToday.setCount > 0)) return 'done'
  if (!td.hasEquipment) return 'noEquipment'
  if (!hasProgram.value) return 'noProgram'
  return 'ready'
})

const nextDay = computed<ProgramDay | null>(() => {
  const days = program.value?.days ?? []
  return days.find((d) => d.key === today.value?.nextDayKey) ?? days[0] ?? null
})

const shortInfo = computed(() => {
  const day = nextDay.value
  if (!day || day.short.length === 0) return { exercises: 0, sets: 0 }
  return { exercises: day.short.length, sets: Math.max(...day.short.map((s) => s.sets)) }
})

const dateLabel = computed(() => {
  if (!mounted.value) return ''
  const iso = today.value?.date ?? brusselsDate()
  return new Intl.DateTimeFormat(localeProperties.value.language ?? 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
})

// In progress
const resumeId = computed(() => openDraft.value?.clientId ?? today.value?.inProgress?.clientId ?? null)
const resumeInfo = computed(() => {
  const d = resumeId.value ? drafts.get(resumeId.value) : null
  if (!d) return { dayKey: today.value?.inProgress?.dayKey ?? null, done: null, total: null, sets: null, segments: null }
  return {
    dayKey: d.dayKey,
    done: doneExerciseCount(d),
    total: d.exercises.length,
    sets: loggedSets(d).length,
    segments: segmentsOf(d),
  }
})

// Finished today
const doneId = computed(() => finishedDraft.value?.clientId ?? today.value?.finishedToday?.clientId ?? null)
const doneInfo = computed(() => {
  const d = doneId.value ? drafts.get(doneId.value) : null
  const days = program.value?.days ?? []
  const dayKey = d ? d.dayKey : (today.value?.finishedToday?.dayKey ?? null)
  // The workout after the one just done: the next day in the program's rotation.
  const index = days.findIndex((day) => day.key === dayKey)
  const next = index >= 0 ? days[(index + 1) % days.length]?.key : today.value?.nextDayKey
  return {
    dayKey,
    exercises: d ? d.exercises.length : null,
    sets: d ? loggedSets(d).length : (today.value?.finishedToday?.setCount ?? 0),
    next: next ?? null,
  }
})

// --- Actions ----------------------------------------------------------------------------
const starting = ref(false)
async function start(short: boolean) {
  const day = nextDay.value
  if (!day || starting.value) return
  starting.value = true
  try {
    await navigateTo(`/workout/${drafts.start(day, short)}`)
  } finally {
    starting.value = false
  }
}

async function resume() {
  if (resumeId.value) await navigateTo(`/workout/${resumeId.value}`)
}

async function seeSummary() {
  if (doneId.value) await navigateTo(`/workout/${doneId.value}`)
}

const finishOpen = ref(false)
const finishing = ref(false)
const finishError = ref(false)
async function confirmFinish() {
  const id = resumeId.value
  if (!id || finishing.value) return
  finishing.value = true
  finishError.value = false
  try {
    // A server-only workout needs its details first; then it is finished like any other.
    const draft = await drafts.ensure(id)
    if (!draft) throw new Error('not_found')
    drafts.finish(id)
    finishOpen.value = false
    await navigateTo(`/workout/${id}`)
  } catch {
    finishOpen.value = false
    finishError.value = true
  } finally {
    finishing.value = false
  }
}

const building = ref(false)
const buildError = ref(false)
const rebuild = ref<'idle' | 'busy' | 'done' | 'error'>('idle')

/** Builds (or rebuilds) the program from the equipment on the server. */
async function generateProgram(): Promise<boolean> {
  try {
    const result = await $fetch<ProgramDto>(GENERATE_URL, { method: 'POST' })
    program.value = result
    cache.writeProgram(result)
    if (today.value) today.value = { ...today.value, hasProgram: true, nextDayKey: today.value.nextDayKey ?? result.days[0]?.key ?? null }
    await load()
    return true
  } catch {
    return false
  }
}

async function build() {
  if (building.value) return
  building.value = true
  buildError.value = false
  buildError.value = !(await generateProgram())
  building.value = false
}

async function rebuildProgram() {
  if (rebuild.value === 'busy') return
  rebuild.value = 'busy'
  rebuild.value = (await generateProgram()) ? 'done' : 'error'
}
</script>

<template>
  <div class="today">
    <main class="today__content">
      <header class="today__head">
        <div>
          <p class="vf-label today__date">{{ dateLabel }}</p>
          <h1 class="vf-display today__title">{{ t('today.title') }}</h1>
        </div>
        <div class="today__badges">
          <WorkoutSyncBadge hide-when-synced />
          <UiSyncBadge v-if="fromCache && !queue.hasPending.value" state="offline" :label="t('sync.offline')" />
        </div>
      </header>

      <p v-if="finishError" class="today__alert" role="alert">{{ t('today.finishError') }}</p>

      <!-- Loading: header is already there; the rest is a same-size placeholder of the ready view. -->
      <TodaySkeleton v-if="phase === 'loading'" />

      <!-- Nothing cached and the server is unreachable. -->
      <UiCard v-else-if="phase === 'error'" variant="hero">
        <div class="today__message">
          <p role="alert">{{ queue.online.value ? t('today.loadError') : t('today.offline') }}</p>
          <UiButton variant="secondary" full-width @click="load">{{ t('today.tryAgain') }}</UiButton>
        </div>
      </UiCard>

      <TodaySetup v-else-if="view === 'noEquipment'" class="vf-reveal" step="equipment" />
      <TodaySetup v-else-if="view === 'noProgram'" class="vf-reveal" step="program" :loading="building" :error="buildError" @build="build" />

      <TodayInProgress
        v-else-if="view === 'progress'"
        class="vf-reveal"
        :day-key="resumeInfo.dayKey"
        :done="resumeInfo.done"
        :total="resumeInfo.total"
        :sets="resumeInfo.sets"
        :segments="resumeInfo.segments"
        :busy="false"
        @resume="resume"
        @finish="finishOpen = true"
      />

      <TodayFinished
        v-else-if="view === 'done'"
        class="vf-reveal"
        :day-key="doneInfo.dayKey"
        :exercises="doneInfo.exercises"
        :sets="doneInfo.sets"
        :next-day-key="doneInfo.next"
        @summary="seeSummary"
      />

      <TodayReady
        v-else-if="view === 'ready' && nextDay"
        class="vf-reveal"
        :day-key="nextDay.key"
        :exercises="nextDay.exercises"
        :short-exercises="shortInfo.exercises"
        :short-sets="shortInfo.sets"
        :starting="starting"
        :rebuild="rebuild"
        @start="start"
        @rebuild="rebuildProgram"
      />

      <TodayFinishSheet
        :open="finishOpen"
        :logged-count="resumeInfo.sets ?? 0"
        :busy="finishing"
        @close="finishOpen = false"
        @confirm="confirmFinish"
      />
    </main>
  </div>
</template>

<style scoped>
.today {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.today__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
  width: 100%;
  max-width: var(--vf-width-page);
  margin: 0 auto;
  padding: var(--vf-space-6) var(--vf-space-4) var(--vf-space-8);
}

.today__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--vf-space-3);
}

.today__date {
  min-height: var(--vf-text-sm);
}

.today__title {
  font-size: var(--vf-text-display);
}

.today__badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--vf-space-2);
}

.today__message {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today__alert {
  padding: var(--vf-space-3);
  border: var(--vf-border) solid var(--vf-color-hard);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-hard);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
}
</style>
