/**
 * The error CODE from a failed $fetch, e.g. 'invalid_credentials' or
 * 'rate_limited' (full list: ApiErrorCode in server/utils/errors.ts).
 * Map it to an i18n key; never show it raw. Empty string = no code (network
 * error, 500): show a generic message.
 *
 * Read it from the response BODY (`data.statusMessage`), not from
 * `error.statusMessage`: ofetch fills the latter from the HTTP status line,
 * and HTTP/2 (what Vercel serves) has no status text - in production it would
 * be empty, and every "which error was it?" check would silently fail.
 */
export function serverMessage(e: unknown): string {
  const err = e as { data?: { statusMessage?: string; message?: string }; statusMessage?: string } | null
  return err?.data?.statusMessage ?? err?.data?.message ?? err?.statusMessage ?? ''
}

/** Extra detail some errors carry: `problems` (weak_password: failed rule ids
 *  'length' | 'lower' | 'upper' | 'number'), `retryAfter` (rate_limited:
 *  seconds), `max` (too_long errors). */
export function serverErrorData(e: unknown): Record<string, unknown> {
  const err = e as { data?: { data?: Record<string, unknown> } } | null
  return err?.data?.data ?? {}
}
