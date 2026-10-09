import { prisma } from '~~/server/utils/prisma'
import { clearSessionCookie, requireUserId, verifyPassword } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { consumeRateLimit, LIMITS } from '~~/server/utils/rateLimit'

/**
 * Delete your account and EVERYTHING in it (project rule #7).
 *
 * One `DELETE FROM "User"`: every model that belongs to a user references it
 * with `onDelete: Cascade`, so sessions, reset tokens and all future data
 * (workouts, sets, equipment...) go with it at the database level. Nothing to
 * remember to clean up here when new models are added, as long as they follow
 * that rule.
 *
 * Requires the current password (like changing it): an unattended open
 * session must not be enough to wipe someone's history.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const { password } = await readJsonObject(event)
  if (typeof password !== 'string') apiError(400, 'invalid_input')

  // Counted before the check (see rateLimit.ts). No clear on success: the
  // key is a hash of a user id that no longer exists, and it's swept in 24 h.
  await consumeRateLimit(event, LIMITS.passwordFailUser, [userId])

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user) apiError(401, 'not_authenticated')

  if (!(await verifyPassword(password, user.passwordHash))) apiError(403, 'wrong_password')

  // deleteMany, not delete: a double-clicked button (two requests) must not
  // turn the second one into a 500 because the row is already gone.
  await prisma.user.deleteMany({ where: { id: userId } })
  clearSessionCookie(event)

  return { ok: true }
})
