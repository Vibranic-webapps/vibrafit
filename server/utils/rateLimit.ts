import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { prisma } from './prisma'
import { apiError } from './errors'

/**
 * Rate limiting, stored in Postgres (the RateLimit table).
 *
 * Why the database: Vercel runs the API as many short-lived serverless
 * instances with no shared memory. An in-memory counter would reset on every
 * cold start and differ per instance, so an attacker would just get a fresh
 * budget. Postgres is already the one thing every instance shares, and an
 * atomic upsert costs one round-trip on endpoints that are rare anyway.
 * (Upstash/Vercel KV would also work, but adds a paid-tier dependency and a
 * new secret for no real gain at this scale.)
 *
 * Model: fixed window per key. The first hit opens a window; hits inside it
 * count up; the first hit after it expires starts a new window at 1.
 *
 * All limits live here, so they can be tuned in one place.
 */
interface Limit {
  bucket: string
  max: number
  windowMs: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const LIMITS = {
  // Failed logins for one email from one IP. Only FAILURES count, and a
  // success clears it, so a normal user who mistypes once is never bothered.
  loginFailEmailIp: { bucket: 'login-fail', max: 5, windowMs: 15 * MINUTE },
  // Failed logins from one IP across ALL emails: stops one machine spraying a
  // common password over many accounts. Never cleared by a success (one valid
  // account must not reset the attacker's budget).
  loginFailIp: { bucket: 'login-fail-ip', max: 30, windowMs: 15 * MINUTE },
  // Signup attempts per IP (every attempt that reaches the database counts,
  // including "email_taken" ones, which limits account enumeration).
  signupIp: { bucket: 'signup-ip', max: 10, windowMs: HOUR },
  // Forgot-password requests per IP.
  forgotIp: { bucket: 'forgot-ip', max: 5, windowMs: HOUR },
  // Reset mails per target address: stops anyone mail-bombing an inbox from
  // many IPs. Over the limit we silently skip the mail (see forgot-password).
  forgotEmail: { bucket: 'forgot-email', max: 3, windowMs: HOUR },
  // Reset attempts per IP. The token is 256 bits, so this isn't about guessing;
  // it caps how much bcrypt work one client can make us do.
  resetIp: { bucket: 'reset-ip', max: 10, windowMs: HOUR },
  // Wrong "current password" on change-password / delete-account, per user.
  // A stolen session must not become an unlimited password oracle.
  passwordFailUser: { bucket: 'password-fail', max: 5, windowMs: 15 * MINUTE },
} satisfies Record<string, Limit>

// Rows are swept once they're this old. Must exceed the longest window.
const SWEEP_AFTER_MS = 24 * HOUR
const SWEEP_PROBABILITY = 0.02

/** The client IP. On Vercel, x-forwarded-for is set by Vercel's edge (a
 *  client-sent value is overwritten), so its first entry is the real client.
 *  Behind any other proxy, re-check this: a spoofable IP weakens the per-IP limits. */
export function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}

/** The DB key: bucket name in clear (readable when debugging), the identity
 *  (email / IP / userId) only as a SHA-256 hash, so no raw personal data is stored. */
function keyFor(limit: Limit, parts: string[]): string {
  const digest = createHash('sha256').update(parts.join('\n')).digest('hex')
  return `${limit.bucket}:${digest}`
}

function tooMany(event: H3Event, windowStart: Date, limit: Limit): never {
  const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + limit.windowMs - Date.now()) / 1000))
  setResponseHeader(event, 'Retry-After', retryAfter)
  apiError(429, 'rate_limited', { retryAfter })
}

/** Count one hit, atomically, and return the new count.
 *  One SQL statement (INSERT ... ON CONFLICT DO UPDATE), so two instances
 *  hitting the same key at the same moment can't both read "4" and write "5".
 *  The window is judged by the DATABASE clock, the one clock all instances share. */
async function hit(limit: Limit, parts: string[]): Promise<{ count: number; windowStart: Date }> {
  const key = keyFor(limit, parts)
  const windowSecs = limit.windowMs / 1000

  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, (now() AT TIME ZONE 'UTC'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSecs})
        THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSecs})
        THEN (now() AT TIME ZONE 'UTC') ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`

  // Opportunistic cleanup instead of a cron: a few percent of hits delete
  // rows whose window ended long ago. Cheap thanks to the windowStart index.
  if (Math.random() < SWEEP_PROBABILITY) {
    await prisma.rateLimit
      .deleteMany({ where: { windowStart: { lt: new Date(Date.now() - SWEEP_AFTER_MS) } } })
      .catch(() => {})
  }

  return rows[0]!
}

/** Every call counts. 429 once the count goes over `max`.
 *  For endpoints where each attempt costs something (signup, forgot, reset). */
export async function consumeRateLimit(event: H3Event, limit: Limit, parts: string[]): Promise<void> {
  const { count, windowStart } = await hit(limit, parts)
  if (count > limit.max) tooMany(event, windowStart, limit)
}

/** Like consumeRateLimit, but returns false instead of throwing. For limits
 *  that must stay invisible to the caller (forgot-password per email). */
export async function tryConsumeRateLimit(limit: Limit, parts: string[]): Promise<boolean> {
  const { count } = await hit(limit, parts)
  return count <= limit.max
}

/** 429 if this key already has `max` hits in the current window. Doesn't count.
 *  Checked BEFORE the password is verified, so a locked-out client gets 429
 *  even with the right password: otherwise the 429-vs-200 difference would
 *  keep working as a password oracle during the lockout. */
export async function assertNotRateLimited(event: H3Event, limit: Limit, parts: string[]): Promise<void> {
  const row = await prisma.rateLimit.findUnique({ where: { key: keyFor(limit, parts) } })
  if (!row) return
  const windowOpen = row.windowStart.getTime() + limit.windowMs > Date.now()
  if (windowOpen && row.count >= limit.max) tooMany(event, row.windowStart, limit)
}

/** Record one failure (for limits that only count failures, e.g. logins). */
export async function recordRateLimitHit(limit: Limit, parts: string[]): Promise<void> {
  await hit(limit, parts)
}

/** Forget a key, e.g. after a successful login or password reset. */
export async function clearRateLimit(limit: Limit, parts: string[]): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key: keyFor(limit, parts) } })
}
