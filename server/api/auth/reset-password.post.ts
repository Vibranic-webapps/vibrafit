import { prisma } from '~~/server/utils/prisma'
import { hashPassword, hashToken, createSession } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { assertStrongPassword } from '~~/server/utils/validate'
import { clearRateLimit, clientIp, consumeRateLimit, LIMITS } from '~~/server/utils/rateLimit'

// Reset links carry 32 random bytes as hex; anything else can't be one.
const TOKEN_SHAPE = /^[0-9a-f]{64}$/

export default defineEventHandler(async (event) => {
  const { token, password } = await readJsonObject(event)
  if (typeof token !== 'string' || typeof password !== 'string') apiError(400, 'invalid_input')

  const ip = clientIp(event)
  await consumeRateLimit(event, LIMITS.resetIp, [ip])

  if (!TOKEN_SHAPE.test(token)) apiError(400, 'invalid_reset_token')

  // Same rules as signup. Checked before the token is consumed, so a weak
  // password just asks again instead of burning the link.
  assertStrongPassword(password)

  const record = await prisma.passwordResetToken.findUnique({
    where: { hashedToken: hashToken(token) },
    include: { user: { select: { email: true } } },
  })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    apiError(400, 'invalid_reset_token')
  }

  const passwordHash = await hashPassword(password)

  // Claim the token atomically (usedAt still null) INSIDE the transaction:
  // two simultaneous submits of the same link can't both succeed.
  const claimed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (count === 0) return false

    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } })
    // Any other outstanding reset links die too.
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } })
    // Log out everywhere: if someone else had a stolen session, changing the
    // password must actually evict them.
    await tx.session.deleteMany({ where: { userId: record.userId } })
    return true
  })
  if (!claimed) apiError(400, 'invalid_reset_token')

  // Owning the inbox proves it's them: lift a login lockout on this
  // email from this device, or they'd be locked out of their new password.
  await clearRateLimit(LIMITS.loginFailEmailIp, [record.user.email, ip])

  // Log the user straight in on their new password.
  await createSession(event, record.userId, true)

  return { ok: true }
})
