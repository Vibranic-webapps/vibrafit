import { prisma } from '~~/server/utils/prisma'
import { requireSession, verifyPassword, hashPassword } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { assertStrongPassword } from '~~/server/utils/validate'
import {
  assertNotRateLimited, clearRateLimit, LIMITS, recordRateLimitHit,
} from '~~/server/utils/rateLimit'

/**
 * Change your password while signed in.
 *
 * - The CURRENT password is required: a session left open on someone else's
 *   screen must not be enough to take over the account.
 * - Every OTHER session is ended: if a stolen session exists anywhere,
 *   changing the password must evict it. This device stays signed in, with
 *   its "remember me" choice intact.
 */
export default defineEventHandler(async (event) => {
  const { userId, sessionId } = await requireSession(event)
  const { current, next } = await readJsonObject(event)

  if (typeof current !== 'string' || typeof next !== 'string') apiError(400, 'invalid_input')

  // Validate the new one first: a typo in it shouldn't count as a wrong-password strike.
  assertStrongPassword(next)

  await assertNotRateLimited(event, LIMITS.passwordFailUser, [userId])

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user) apiError(401, 'not_authenticated')

  if (!(await verifyPassword(current, user.passwordHash))) {
    await recordRateLimitHit(LIMITS.passwordFailUser, [userId])
    // 403, not 401: you ARE signed in; the password you typed is just wrong.
    apiError(403, 'wrong_password')
  }

  const passwordHash = await hashPassword(next)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId, id: { not: sessionId } } }),
    // Outstanding "forgot password" links would still work on the OLD
    // account state: they die with the change.
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
  ])
  await clearRateLimit(LIMITS.passwordFailUser, [userId])

  return { ok: true }
})
