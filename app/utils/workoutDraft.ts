/**
 * The workout on this phone, as plain data plus pure functions. No Vue, no
 * storage, no network: the screens and the storage layer (useWorkoutDraft)
 * call these, and `npm test` can too.
 *
 * A draft is a snapshot: the exercises are copied in when the workout starts,
 * so regenerating the program mid-workout (or being offline) changes nothing.
 * "Where am I?" is never stored; it is worked out from the logged sets, so it
 * can't drift out of step with them.
 */
import type { Feeling, ProgramDay, ProgramExercise, SessionRecord, SetRecord, WhyDto } from './workoutTypes'

/** What a session record says when its program day no longer exists (rare). */
export const FALLBACK_DAY_KEY = 'A'

/** One exercise as it is done today (sets may be fewer than the program's, for the 10-min version). */
export interface DraftExercise {
  slug: string
  nameKey: string
  cueKey: string
  measure: 'reps' | 'seconds'
  perSide: boolean
  loadType: ProgramExercise['loadType']
  sets: number
  targetMin: number
  targetMax: number
  loadGrams: number | null
  loadMode: ProgramExercise['loadMode']
  why: WhyDto
}

export interface RestState {
  /** Epoch ms when rest ends. Time is always computed from this, never from counting ticks. */
  endsAt: number
  /** Seconds the rest started with (+15 s adds to it); drives the bar. */
  total: number
  /** Epoch ms when rest began (for the double-tap guard). */
  startedAt: number
}

export interface WorkoutDraft {
  v: 1
  clientId: string
  /** null only for a workout rebuilt from the server whose day was removed since. */
  dayKey: string | null
  isShort: boolean
  date: string
  startedAt: string
  finishedAt: string | null
  /** Finished with "Finish workout now" before the last exercise. */
  finishedEarly: boolean
  exercises: DraftExercise[]
  sets: SetRecord[]
  /** Slugs the user skipped (no set is recorded for a skip). */
  skipped: string[]
  rest: RestState | null
  /** Index of the exercise that shows "Stopped for pain. Your other sets are saved." */
  painNoticeIndex: number | null
}

export interface Position {
  exerciseIndex: number
  /** The next set to do, 1-based. */
  setNumber: number
}

export type ExerciseOutcome = 'done' | 'skipped' | 'pain' | 'current' | 'pending'

// --- Build --------------------------------------------------------------------

function toDraftExercise(ex: ProgramExercise, sets: number): DraftExercise {
  return {
    slug: ex.slug,
    nameKey: ex.nameKey,
    cueKey: ex.cueKey,
    measure: ex.measure,
    perSide: ex.perSide,
    loadType: ex.loadType,
    sets,
    targetMin: ex.targetMin,
    targetMax: ex.targetMax,
    loadGrams: ex.loadGrams,
    loadMode: ex.loadMode,
    why: ex.why,
  }
}

/** The exercises of a day: all of them, or the 10-minute list (ids + fewer sets). */
export function exercisesForDay(day: ProgramDay, isShort: boolean): DraftExercise[] {
  if (!isShort) return day.exercises.map((ex) => toDraftExercise(ex, ex.sets))
  const byId = new Map(day.exercises.map((ex) => [ex.id, ex] as const))
  return day.short.flatMap((item) => {
    const ex = byId.get(item.id)
    return ex ? [toDraftExercise(ex, Math.min(item.sets, ex.sets))] : []
  })
}

export function buildDraft(input: {
  clientId: string
  day: ProgramDay
  isShort: boolean
  date: string
  startedAt: string
}): WorkoutDraft {
  return {
    v: 1,
    clientId: input.clientId,
    dayKey: input.day.key,
    isShort: input.isShort,
    date: input.date,
    startedAt: input.startedAt,
    finishedAt: null,
    finishedEarly: false,
    exercises: exercisesForDay(input.day, input.isShort),
    sets: [],
    skipped: [],
    rest: null,
    painNoticeIndex: null,
  }
}

/** The record the server stores for this workout (what the sync queue sends). */
export function sessionOf(draft: WorkoutDraft): SessionRecord {
  return {
    clientId: draft.clientId,
    dayKey: draft.dayKey ?? FALLBACK_DAY_KEY,
    isShort: draft.isShort,
    date: draft.date,
    startedAt: draft.startedAt,
    finishedAt: draft.finishedAt,
  }
}

// --- Where am I? ----------------------------------------------------------------

export function setsOf(draft: WorkoutDraft, slug: string): SetRecord[] {
  return draft.sets.filter((s) => s.exerciseSlug === slug)
}

function hasPain(draft: WorkoutDraft, slug: string): boolean {
  return draft.sets.some((s) => s.exerciseSlug === slug && s.skippedForPain)
}

/** Sets with a real result (pain markers have no amount). */
export function loggedSets(draft: WorkoutDraft): SetRecord[] {
  return draft.sets.filter((s) => !s.skippedForPain)
}

/** The first exercise that still has sets to do, and its next set. null = nothing left. */
export function currentPosition(draft: WorkoutDraft): Position | null {
  for (const [exerciseIndex, ex] of draft.exercises.entries()) {
    if (draft.skipped.includes(ex.slug) || hasPain(draft, ex.slug)) continue
    const done = setsOf(draft, ex.slug).length
    if (done < ex.sets) return { exerciseIndex, setNumber: done + 1 }
  }
  return null
}

export function outcomeOf(draft: WorkoutDraft, index: number): ExerciseOutcome {
  const ex = draft.exercises[index]
  if (!ex) return 'pending'
  if (hasPain(draft, ex.slug)) return 'pain'
  if (draft.skipped.includes(ex.slug)) return 'skipped'
  const logged = setsOf(draft, ex.slug).length
  if (logged >= ex.sets) return 'done'
  if (!draft.finishedAt && currentPosition(draft)?.exerciseIndex === index) return 'current'
  // Left unfinished by "Finish workout now": counts as done if it got some sets, else skipped.
  if (draft.finishedAt) return logged > 0 ? 'done' : 'skipped'
  return 'pending'
}

/** Segments for UiProgressSegments (pain shows as skipped: dashed, never as done). */
export function segmentsOf(draft: WorkoutDraft): ('done' | 'current' | 'pending' | 'skipped')[] {
  return draft.exercises.map((_, i) => {
    const outcome = outcomeOf(draft, i)
    return outcome === 'pain' ? 'skipped' : outcome
  })
}

/** Exercises completed or left behind (everything before the current one). */
export function doneExerciseCount(draft: WorkoutDraft): number {
  const position = currentPosition(draft)
  return position ? position.exerciseIndex : draft.exercises.length
}

/** The most recently logged set (not a pain marker), for the "Fix" link. */
export function lastLoggedSet(draft: WorkoutDraft): SetRecord | null {
  const sets = loggedSets(draft)
  return sets.length ? sets.reduce((a, b) => (b.loggedAt >= a.loggedAt ? b : a)) : null
}

/**
 * Stepper starting value: the previous set of this exercise, else the BOTTOM of
 * its range. Not the top: a quick tap on Log set would then record reps that
 * may not have happened, and Phase 2 progression reads "top of range on every
 * set" as "make it heavier". Under-logging is the safe mistake.
 */
export function prefillAmount(draft: WorkoutDraft, exercise: DraftExercise): number {
  const previous = setsOf(draft, exercise.slug)
    .filter((s) => s.amount !== null)
    .sort((a, b) => a.setNumber - b.setNumber)
    .at(-1)
  return previous?.amount ?? exercise.targetMin
}

// --- Changing the draft (all mutate the draft they are given) --------------------

/** Adds a set, or replaces the one with the same clientId ("Fix last set"). */
export function upsertSet(draft: WorkoutDraft, set: SetRecord): void {
  const index = draft.sets.findIndex((s) => s.clientId === set.clientId)
  if (index >= 0) draft.sets[index] = set
  else draft.sets.push(set)
}

export function makeSet(input: {
  clientId: string
  draft: WorkoutDraft
  exercise: DraftExercise
  setNumber: number
  amount: number | null
  feeling: Feeling | null
  skippedForPain: boolean
  loggedAt: string
}): SetRecord {
  return {
    clientId: input.clientId,
    sessionClientId: input.draft.clientId,
    exerciseSlug: input.exercise.slug,
    setNumber: input.setNumber,
    amount: input.amount,
    // Pain markers carry no load: nothing was lifted.
    loadGrams: input.skippedForPain ? null : input.exercise.loadGrams,
    feeling: input.skippedForPain ? null : input.feeling,
    skippedForPain: input.skippedForPain,
    loggedAt: input.loggedAt,
  }
}

export function finishDraft(draft: WorkoutDraft, at: string): void {
  draft.finishedEarly = currentPosition(draft) !== null
  draft.finishedAt = at
  draft.rest = null
}

// --- Summary --------------------------------------------------------------------

export interface SummaryRow {
  slug: string
  nameKey: string
  outcome: 'done' | 'skipped' | 'pain'
  loadGrams: number | null
  loadType: DraftExercise['loadType']
  loadMode: DraftExercise['loadMode']
  measure: DraftExercise['measure']
  /** Amounts in set order, e.g. [12, 11, 10]. */
  amounts: number[]
}

export interface Summary {
  rows: SummaryRow[]
  exerciseCount: number
  exercisesDone: number
  setCount: number
  minutes: number
  hasPain: boolean
}

export function summarise(draft: WorkoutDraft): Summary {
  const rows: SummaryRow[] = draft.exercises.map((ex, i) => {
    const outcome = outcomeOf(draft, i)
    const amounts = setsOf(draft, ex.slug)
      .filter((s) => s.amount !== null)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((s) => s.amount as number)
    // An exercise stopped for pain keeps the sets it got; only a bare skip shows as skipped.
    const shown: SummaryRow['outcome'] = outcome === 'pain' ? 'pain' : outcome === 'done' ? 'done' : 'skipped'
    return {
      slug: ex.slug,
      nameKey: ex.nameKey,
      outcome: shown,
      loadGrams: ex.loadGrams,
      loadType: ex.loadType,
      loadMode: ex.loadMode,
      measure: ex.measure,
      amounts,
    }
  })
  const start = Date.parse(draft.startedAt)
  const end = draft.finishedAt ? Date.parse(draft.finishedAt) : Date.now()
  return {
    rows,
    exerciseCount: rows.length,
    exercisesDone: rows.filter((r) => r.outcome === 'done' || (r.outcome === 'pain' && r.amounts.length > 0)).length,
    setCount: loggedSets(draft).length,
    minutes: Math.max(1, Math.round((end - start) / 60_000)),
    hasPain: rows.some((r) => r.outcome === 'pain'),
  }
}
