/**
 * Shapes the Today and workout screens share. These mirror the API contract
 * (GET /api/program, GET /api/today, POST /api/sessions/sync); weights are
 * always integer grams.
 */

// --- GET /api/program ---------------------------------------------------------

export interface WhyDto {
  key: string
  /** Numbers in GRAMS (target, load). Convert with gramsToKg before passing to t(). */
  params: Record<string, number>
}

export interface ProgramExercise {
  id: string
  order: number
  slug: string
  nameKey: string
  cueKey: string
  measure: 'reps' | 'seconds'
  perSide: boolean
  loadType: 'single' | 'pair' | 'band' | 'bodyweight'
  sets: number
  targetMin: number
  targetMax: number
  loadGrams: number | null
  loadMode: 'single' | 'pair' | null
  /** Plate recipe (grams). Absent in programs cached before this existed. */
  build?: { handleGrams: number; dumbbells: number[][] } | null
  why: WhyDto
}

export interface ProgramDay {
  key: string
  exercises: ProgramExercise[]
  /** The 10-minute version: which exercises (by id), with how many sets. */
  short: { id: string; sets: number }[]
}

export interface ProgramDto {
  days: ProgramDay[]
}

/** Reasons the server gives for a rejected item (POST /api/sessions/sync). Other text is shown as generic. */
export const KNOWN_REJECT_REASONS = ['invalid_date', 'date_out_of_range', 'unknown_session', 'unknown_exercise', 'session_mismatch'] as const

// --- GET /api/today -----------------------------------------------------------

export interface TodayDto {
  /** Brussels calendar date, "YYYY-MM-DD". */
  date: string
  hasEquipment: boolean
  hasProgram: boolean
  nextDayKey: string | null
  inProgress: { clientId: string; dayKey: string | null; isShort: boolean; startedAt: string } | null
  finishedToday: { clientId: string; dayKey: string | null; setCount: number } | null
}

// --- POST /api/sessions/sync --------------------------------------------------

export type Feeling = 'easy' | 'good' | 'hard'

export interface SessionRecord {
  clientId: string
  dayKey: string
  isShort: boolean
  date: string
  startedAt: string
  finishedAt: string | null
}

export interface SetRecord {
  clientId: string
  sessionClientId: string
  exerciseSlug: string
  setNumber: number
  /** Reps, or seconds for timed exercises. null = stopped for pain. */
  amount: number | null
  loadGrams: number | null
  feeling: Feeling | null
  skippedForPain: boolean
  loggedAt: string
}

export interface SyncResponse {
  sessions: string[]
  sets: string[]
  rejected: { clientId: string; kind: 'session' | 'set'; reason: string }[]
}

// --- GET /api/sessions/:clientId ----------------------------------------------

export interface SessionDetailDto {
  /** dayKey is null in a rare edge case: the day was removed from the program since. */
  session: Omit<SessionRecord, 'dayKey'> & { dayKey: string | null }
  sets: SetRecord[]
}
