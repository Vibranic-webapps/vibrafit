// Calendar dates in Europe/Brussels (non-negotiable #5): a workout "happens"
// on the Brussels date it was started, whatever the device or server time zone.
// Pure and dependency-free, shared by client (offline start) and server.

const TIME_ZONE = 'Europe/Brussels'

// en-CA formats as YYYY-MM-DD.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The Brussels calendar date of an instant, as "YYYY-MM-DD". */
export function brusselsDate(at: Date = new Date()): string {
  return formatter.format(at)
}

/** True for a real calendar date written as "YYYY-MM-DD" (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}
