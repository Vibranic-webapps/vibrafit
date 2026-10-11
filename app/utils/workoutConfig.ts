/**
 * Every number that shapes how a workout behaves, in one place. Change them
 * here; no component carries its own copy.
 */
import type { ProgramExercise } from './workoutTypes'

/** Rest between sets: heavier (loaded) lifts rest longer than light/bodyweight work. */
export const REST_SECONDS_LOADED = 90
export const REST_SECONDS_LIGHT = 60

/** The "+15 s" rest button. */
export const REST_EXTEND_SECONDS = 15

/**
 * Taps on "Skip rest" are ignored this long after rest starts: a double-tap on
 * "Log set" would otherwise skip the rest the moment it appears.
 */
export const SKIP_REST_GUARD_MS = 600

/** Rest screen announces "10 seconds left." once. */
export const REST_WARNING_SECONDS = 10

/** Short buzz when a set is logged / when rest ends (only where the device supports it). */
export const HAPTIC_LOG_MS = 30
export const HAPTIC_REST_OVER_MS = 200

/** Timed exercises: the stepper after Stop moves in these steps and within these bounds. */
export const HOLD_STEP_SECONDS = 5
export const HOLD_MAX_SECONDS = 600

/** Reps stepper bounds (spec: 0 to 50). */
export const REPS_MAX = 50

/** Rough time model for the "~35 min" estimate on Today: seconds of work per set. */
export const WORK_SECONDS_PER_SET = 45
/** Round the estimate to the nearest N minutes. */
export const ESTIMATE_ROUND_MINUTES = 5

/** A finished draft is kept on the phone this long (for "See summary"), then pruned. */
export const DRAFT_KEEP_DAYS = 14

/** Failed syncs retry after 2 s, 4 s, 8 s ... up to this. A steady timer also retries. */
export const SYNC_BACKOFF_START_MS = 2000
export const SYNC_BACKOFF_MAX_MS = 30_000
export const SYNC_INTERVAL_MS = 30_000

/** Server limits per request (POST /api/sessions/sync). */
export const SYNC_MAX_SESSIONS = 20
export const SYNC_MAX_SETS = 300

export function restSecondsFor(exercise: Pick<ProgramExercise, 'loadType' | 'measure'>): number {
  const loaded = exercise.loadType === 'single' || exercise.loadType === 'pair'
  return loaded ? REST_SECONDS_LOADED : REST_SECONDS_LIGHT
}

/** Minutes for a list of {sets, loadType, measure}: work plus rest, rounded. */
export function estimateMinutes(items: Pick<ProgramExercise, 'sets' | 'loadType' | 'measure'>[]): number {
  const seconds = items.reduce((sum, item) => sum + item.sets * (WORK_SECONDS_PER_SET + restSecondsFor(item)), 0)
  const rounded = Math.round(seconds / 60 / ESTIMATE_ROUND_MINUTES) * ESTIMATE_ROUND_MINUTES
  return Math.max(ESTIMATE_ROUND_MINUTES, rounded)
}
