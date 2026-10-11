// Rules of POST /api/sessions/sync (the offline queue's one endpoint): body
// shape, the date window, and how a resent session merges into the stored one.
// Pure and dependency-free so the client can reuse the types and `npm test`
// can cover every rule. The database side is server/utils/sessions.ts.
//
// Non-negotiable #6: a logged set is never lost. So the server accepts late,
// repeated and out-of-order sends, and never lets a stale resend undo progress.

import { daysBetween, isIsoDate } from './brusselsDate.ts'

export type SetFeeling = 'easy' | 'good' | 'hard'

export interface SessionIn {
  clientId: string
  dayKey: string
  isShort: boolean
  /** Brussels calendar date the workout belongs to, "YYYY-MM-DD". */
  date: string
  startedAt: string
  finishedAt: string | null
}

export interface SetIn {
  clientId: string
  sessionClientId: string
  exerciseSlug: string
  setNumber: number
  amount: number | null
  loadGrams: number | null
  feeling: SetFeeling | null
  skippedForPain: boolean
  loggedAt: string
}

export interface SyncBody {
  sessions: SessionIn[]
  sets: SetIn[]
}

export const SYNC_LIMITS = {
  sessions: 20,
  sets: 300,
  setNumberMax: 20,
  amountMax: 3600,
  loadGramsMax: 200_000,
  dayKeyMax: 16,
  slugMax: 64,
  /** How far back a phone that was offline may still sync, and how far ahead (timezone slack). */
  daysBack: 60,
  daysAhead: 1,
} as const

const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function clientId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_ID.test(value)
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))
}

function intBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= max
}

function parseSession(raw: unknown): SessionIn | null {
  if (!isRecord(raw)) return null
  const { clientId: id, dayKey, isShort, date, startedAt, finishedAt } = raw
  if (!clientId(id) || !text(dayKey, SYNC_LIMITS.dayKeyMax) || typeof isShort !== 'boolean') return null
  if (typeof date !== 'string' || date.length > 10) return null // the calendar check is a per-item rule, below
  if (!timestamp(startedAt) || !(finishedAt === null || timestamp(finishedAt))) return null
  return { clientId: id, dayKey, isShort, date, startedAt, finishedAt }
}

function parseSet(raw: unknown): SetIn | null {
  if (!isRecord(raw)) return null
  const { clientId: id, sessionClientId, exerciseSlug, setNumber, amount, loadGrams, feeling, skippedForPain, loggedAt } = raw
  if (!clientId(id) || !clientId(sessionClientId) || !text(exerciseSlug, SYNC_LIMITS.slugMax)) return null
  if (!intBetween(setNumber, 1, SYNC_LIMITS.setNumberMax)) return null
  if (!(amount === null || intBetween(amount, 0, SYNC_LIMITS.amountMax))) return null
  if (!(loadGrams === null || intBetween(loadGrams, 0, SYNC_LIMITS.loadGramsMax))) return null
  if (!(feeling === null || feeling === 'easy' || feeling === 'good' || feeling === 'hard')) return null
  if (typeof skippedForPain !== 'boolean' || !timestamp(loggedAt)) return null
  return { clientId: id, sessionClientId, exerciseSlug, setNumber, amount, loadGrams, feeling, skippedForPain, loggedAt }
}

/** The request body as clean data, or null when its shape is wrong (the endpoint answers 400). */
export function parseSyncBody(body: unknown): SyncBody | null {
  if (!isRecord(body) || !Array.isArray(body.sessions) || !Array.isArray(body.sets)) return null
  if (body.sessions.length > SYNC_LIMITS.sessions || body.sets.length > SYNC_LIMITS.sets) return null
  const sessions = body.sessions.map(parseSession)
  const sets = body.sets.map(parseSet)
  if (sessions.includes(null) || sets.includes(null)) return null
  return { sessions: sessions as SessionIn[], sets: sets as SetIn[] }
}

export type DateProblem = 'invalid_date' | 'date_out_of_range'

/**
 * Is `date` an acceptable workout date for a NEW session? `today` is the
 * server's Brussels date. A phone may be a day ahead (time zones, clock
 * drift); a phone offline for days must still sync, up to 60 days back.
 */
export function sessionDateProblem(date: string, today: string): DateProblem | null {
  if (!isIsoDate(date)) return 'invalid_date'
  const diff = daysBetween(today, date)
  return diff > SYNC_LIMITS.daysAhead || diff < -SYNC_LIMITS.daysBack ? 'date_out_of_range' : null
}

/**
 * What a resent session may change on the stored one:
 *  - isShort follows the latest send;
 *  - finishedAt can be SET but never cleared or moved once set, so a stale
 *    resend (sent before the user finished) cannot "un-finish" a workout.
 * date and startedAt never change. Returns the fields to update, or null.
 */
export function mergeSessionUpdate(
  stored: { isShort: boolean; finishedAt: Date | null },
  incoming: { isShort: boolean; finishedAt: Date | null },
): { isShort?: boolean; finishedAt?: Date } | null {
  const patch: { isShort?: boolean; finishedAt?: Date } = {}
  if (incoming.isShort !== stored.isShort) patch.isShort = incoming.isShort
  if (stored.finishedAt === null && incoming.finishedAt !== null) patch.finishedAt = incoming.finishedAt
  return Object.keys(patch).length ? patch : null
}

/** Several sends of one session inside a single request fold into one, by the same rules. */
export function collapseSessions(items: readonly SessionIn[]): SessionIn[] {
  const byId = new Map<string, SessionIn>()
  for (const item of items) {
    const first = byId.get(item.clientId)
    byId.set(item.clientId, first ? { ...first, isShort: item.isShort, finishedAt: first.finishedAt ?? item.finishedAt } : item)
  }
  return [...byId.values()]
}

/** Several sends of one set inside a single request: the last one wins ("fix last set"). */
export function collapseSets(items: readonly SetIn[]): SetIn[] {
  return [...new Map(items.map((item) => [item.clientId, item] as const)).values()]
}
