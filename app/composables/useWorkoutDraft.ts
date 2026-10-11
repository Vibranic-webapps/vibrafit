/**
 * Workouts on this phone ("vf:<userId>:workouts"): what's being done, which
 * sets are logged, where the rest timer stands. The UI reads this; the sync
 * outbox (useSetQueue) is a separate, smaller list of "still to send".
 *
 * Lifecycle of a workout
 *   start()    -> draft created, session record queued
 *   (screens)  -> mutate() adds sets / rest / skips
 *   finish()   -> finishedAt set, session record queued again
 *   prune()    -> finished drafts are dropped after DRAFT_KEEP_DAYS
 *
 * A local draft always wins over what the server says (it is newer).
 */
import { brusselsDate } from '~~/shared/utils/brusselsDate'
import { isInProgress } from '~~/shared/utils/today'
import {
  buildDraft,
  exercisesForDay,
  finishDraft,
  loggedSets,
  sessionOf,
  type DraftExercise,
  type WorkoutDraft,
} from '~/utils/workoutDraft'
import type { ProgramDay, SessionDetailDto } from '~/utils/workoutTypes'

interface DraftFile {
  v: 1
  drafts: Record<string, WorkoutDraft>
}

const drafts = ref<Record<string, WorkoutDraft>>({})
const storageOk = ref(true)
let userId: string | null = null
let listening = false

const storageKey = () => userKey(userId ?? 'nobody', 'workouts')

function readFile(): DraftFile {
  const memory: DraftFile = { v: 1, drafts: { ...drafts.value } }
  if (!storageOk.value) return memory
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw === null) return { v: 1, drafts: {} }
    const parsed = JSON.parse(raw) as DraftFile | null
    return parsed && typeof parsed.drafts === 'object' && parsed.drafts ? parsed : memory
  } catch {
    return memory
  }
}

function commit(change: (file: DraftFile) => void) {
  if (!userId) return
  const file = readFile()
  change(file)
  storageOk.value = writeJson(storageKey(), file)
  drafts.value = file.drafts
}

function prune() {
  const cutoff = Date.now() - DRAFT_KEEP_DAYS * 86_400_000
  commit((file) => {
    for (const [id, draft] of Object.entries(file.drafts)) {
      const last = Date.parse(draft.finishedAt ?? draft.startedAt)
      if (last < cutoff) delete file.drafts[id]
    }
  })
}

/** Exercise entry for a set whose exercise is no longer in the program. */
function unknownExercise(slug: string, sets: number): DraftExercise {
  return {
    slug,
    nameKey: '',
    cueKey: '',
    measure: 'reps',
    perSide: false,
    loadType: 'bodyweight',
    sets,
    targetMin: 1,
    targetMax: 10,
    loadGrams: null,
    loadMode: null,
    why: { key: 'program.why.custom', params: {} },
  }
}

export function useWorkoutDraft() {
  const queue = useSetQueue()
  const cache = useOfflineCache()

  function init(id: string) {
    if (!import.meta.client) return
    if (!listening) {
      listening = true
      // Another tab changed the drafts.
      window.addEventListener('storage', (event) => {
        if (userId && event.key === storageKey()) drafts.value = readFile().drafts
      })
    }
    if (userId !== id) {
      userId = id
      storageOk.value = true
      drafts.value = readFile().drafts
      prune()
    }
  }

  function reset() {
    userId = null
    drafts.value = {}
  }

  const get = (clientId: string): WorkoutDraft | null => drafts.value[clientId] ?? null

  /** Change one draft (re-reads storage first, so a second tab's changes survive). */
  function mutate(clientId: string, change: (draft: WorkoutDraft) => void): WorkoutDraft | null {
    commit((file) => {
      const draft = file.drafts[clientId]
      if (draft) change(draft)
    })
    return get(clientId)
  }

  /** The workout started and not finished, unless it is old enough to count as abandoned. */
  function openDraft(): WorkoutDraft | null {
    const now = new Date()
    const open = Object.values(drafts.value).filter((d) =>
      isInProgress({ startedAt: new Date(d.startedAt), finishedAt: null }, now) && d.finishedAt === null
    )
    return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
  }

  /**
   * The most recent workout finished on this Brussels date. One closed with no
   * set logged doesn't count: nothing was trained, so Today offers Start again.
   */
  function finishedOn(date: string): WorkoutDraft | null {
    const done = Object.values(drafts.value).filter(
      (d) => d.finishedAt !== null && d.date === date && loggedSets(d).length > 0
    )
    return done.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))[0] ?? null
  }

  /** Starts a workout from a program day. Works fully offline. */
  function start(day: ProgramDay, isShort: boolean): string {
    const draft = buildDraft({
      clientId: newId(),
      day,
      isShort,
      date: brusselsDate(),
      startedAt: new Date().toISOString(),
    })
    commit((file) => {
      file.drafts[draft.clientId] = draft
    })
    queue.enqueueSession(sessionOf(draft))
    return draft.clientId
  }

  /** Ends the workout. The session record is queued BEFORE the draft changes, so a crash can't leave it unsynced. */
  function finish(clientId: string): WorkoutDraft | null {
    const current = get(clientId)
    if (!current || current.finishedAt) return current
    const at = new Date().toISOString()
    queue.enqueueSession({ ...sessionOf(current), finishedAt: at })
    return mutate(clientId, (draft) => finishDraft(draft, at))
  }

  /**
   * The draft for a workout id: the one on this phone, or (e.g. after
   * switching phones) rebuilt from the server. null = the server doesn't know it.
   */
  async function ensure(clientId: string): Promise<WorkoutDraft | null> {
    const local = get(clientId)
    if (local) return local

    let detail: SessionDetailDto
    try {
      detail = await $fetch<SessionDetailDto>(`/api/sessions/${encodeURIComponent(clientId)}`)
    } catch (error) {
      const status = (error as { statusCode?: number; status?: number }).statusCode ?? (error as { status?: number }).status
      if (status === 404) return null
      throw error
    }

    const program = cache.readProgram() ?? (await cache.fetchProgram().catch(() => null))
    const { session } = detail
    const day = program?.days.find((d) => d.key === session.dayKey)
    const exercises = day ? exercisesForDay(day, session.isShort) : []
    // Sets of exercises that are no longer in the program still show up in the summary.
    for (const set of detail.sets) {
      if (!exercises.some((e) => e.slug === set.exerciseSlug)) {
        const count = detail.sets.filter((s) => s.exerciseSlug === set.exerciseSlug).length
        exercises.push(unknownExercise(set.exerciseSlug, count))
      }
    }

    const draft: WorkoutDraft = {
      v: 1,
      clientId: session.clientId,
      dayKey: session.dayKey,
      isShort: session.isShort,
      date: session.date,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      finishedEarly: false,
      exercises,
      sets: detail.sets,
      skipped: [],
      rest: null,
      painNoticeIndex: null,
    }
    commit((file) => {
      file.drafts[draft.clientId] ??= draft
    })
    return get(clientId)
  }

  return { storageOk: readonly(storageOk), init, reset, get, mutate, openDraft, finishedOn, start, finish, ensure }
}
