// "What's next?" rules for the Today screen. Pure and dependency-free, tested
// with `npm test`. The database side is server/utils/sessions.ts.

/**
 * The program day to do next: the day AFTER the one trained last, wrapping
 * around. `dayKeys` is the user's days in rotation order ("A", "B"...). No
 * program -> null. Nothing trained yet, or the last day no longer exists
 * (program regenerated) -> the first day.
 */
export function nextDayKey(dayKeys: readonly string[], lastTrainedKey: string | null): string | null {
  if (dayKeys.length === 0) return null
  const index = lastTrainedKey === null ? -1 : dayKeys.indexOf(lastTrainedKey)
  return dayKeys[(index + 1) % dayKeys.length] ?? null
}

/** An unfinished workout older than this is considered abandoned, not "in progress". */
export const IN_PROGRESS_HOURS = 12

/** Sessions started before this instant are no longer "in progress". */
export function inProgressCutoff(now: Date): Date {
  return new Date(now.getTime() - IN_PROGRESS_HOURS * 3_600_000)
}

export function isInProgress(session: { startedAt: Date; finishedAt: Date | null }, now: Date): boolean {
  return session.finishedAt === null && session.startedAt.getTime() >= inProgressCutoff(now).getTime()
}
