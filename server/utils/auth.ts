import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { prisma } from './prisma'
import { apiError } from './errors'

// Ported from Vibravault (itself ported from VibraFlow's lib/auth/*):
// DB-backed sessions, bcrypt passwords, an httpOnly cookie with a random token.

export const SESSION_COOKIE = 'vibrafit_session'

// "Remember me" ticked: stay logged in across browser restarts.
const SESSION_TTL_REMEMBER_MS = 1000 * 60 * 60 * 24 * 30
// Not ticked: a shorter DB lifetime AND a session cookie (no expiry attribute),
// so the browser discards it when it closes.
const SESSION_TTL_SESSION_MS = 1000 * 60 * 60 * 12

// bcrypt cost factor. Higher = slower to compute = harder to brute-force.
const SALT_ROUNDS = 12

/** The user shape every auth endpoint returns (matches AuthUser in
 *  app/composables/useAuthUser.ts). Never include passwordHash. */
export function toAuthUser(user: { id: string; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name }
}

/** Hash a plaintext password. bcrypt embeds a random salt in the output, so we
 *  never store or manage salts ourselves. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// Login for an UNKNOWN email still runs one bcrypt compare against this, so
// "no such account" takes as long as "wrong password". Without it, response
// time alone would reveal which emails are registered. Computed once per
// instance, lazily, so cold starts don't pay for it unless someone logs in.
let dummyHash: Promise<string> | null = null
export function verifyAgainstDummy(plain: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash('vibrafit-no-such-user', SALT_ROUNDS)
  return dummyHash.then((h) => bcrypt.compare(plain, h)).then(() => false)
}

/** SHA-256 of a random token (session cookie or reset link) before it touches
 *  the database. Plain SHA-256 is enough: the token is already 32 random
 *  bytes, so it doesn't need the slow salted hashing that passwords do. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/** Create a session: random token to the cookie, only its hash to the DB.
 *
 *  `remember` controls BOTH halves, and both matter:
 *   - the DB row's expiresAt (server-side truth)
 *   - whether the cookie gets an `expires` attribute at all. Without one it is
 *     a "session cookie" and the browser drops it on close, which is what
 *     "don't remember me" actually has to mean.
 */
export async function createSession(
  event: H3Event,
  userId: string,
  remember = true,
): Promise<void> {
  const rawToken = randomBytes(32).toString('hex')

  // The schema deliberately has no default on expiresAt: Prisma's DSL can't
  // express "now + 30 days", so the rule lives here, in exactly one place.
  const ttl = remember ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_SESSION_MS
  const expiresAt = new Date(Date.now() + ttl)

  await prisma.session.create({
    data: { hashedToken: hashToken(rawToken), userId, expiresAt },
  })

  setCookie(event, SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Omitted entirely when not remembering -> session cookie.
    ...(remember ? { expires: expiresAt } : {}),
  })
}

/** Read the current session, or null. Only reads the cookie: safe anywhere. */
export async function readSession(
  event: H3Event,
): Promise<{ userId: string; sessionId: string } | null> {
  const rawToken = getCookie(event, SESSION_COOKIE)
  if (!rawToken) return null

  const session = await prisma.session.findUnique({
    where: { hashedToken: hashToken(rawToken) },
  })
  if (!session) return null

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return { userId: session.userId, sessionId: session.id }
}

/** For protected API routes: the session, or a 401. */
export async function requireSession(event: H3Event): Promise<{ userId: string; sessionId: string }> {
  const session = await readSession(event)
  if (!session) apiError(401, 'not_authenticated')
  return session
}

/** For protected API routes: the userId, or a 401. Every query that follows
 *  must be scoped with it (`where: { userId }`). */
export async function requireUserId(event: H3Event): Promise<string> {
  return (await requireSession(event)).userId
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/** Destroy the current session: delete the row and clear the cookie. */
export async function destroySession(event: H3Event): Promise<void> {
  const rawToken = getCookie(event, SESSION_COOKIE)

  if (rawToken) {
    await prisma.session
      .deleteMany({ where: { hashedToken: hashToken(rawToken) } })
      .catch(() => {})
  }

  clearSessionCookie(event)
}
