import { prisma } from '~~/server/utils/prisma'
import { verifyPassword, verifyAgainstDummy, createSession, toAuthUser } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { EMAIL_MAX, normalizeEmail, PASSWORD_MAX_BYTES } from '~~/server/utils/validate'
import {
  clearRateLimit, clientIp, consumeRateLimit, LIMITS, refundRateLimit,
} from '~~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const { email, password, remember } = await readJsonObject(event)

  if (typeof email !== 'string' || typeof password !== 'string') apiError(400, 'invalid_input')

  const normalizedEmail = normalizeEmail(email)
  const ip = clientIp(event)
  const emailIp = [normalizedEmail, ip]

  // Counted BEFORE the password is checked (see rateLimit.ts): parallel
  // bursts can't slip past, and the right password during a lockout gets the
  // same 429 as a wrong one (no oracle).
  await consumeRateLimit(event, LIMITS.loginFailEmailIp, emailIp)
  await consumeRateLimit(event, LIMITS.loginFailIp, [ip])

  // Oversized input can't match any stored account (signup refuses it), so
  // skip the lookup, but still count it as a failure below.
  const plausible = normalizedEmail.length <= EMAIL_MAX
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES

  const user = plausible
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : null

  // Unknown email still costs one bcrypt compare (see verifyAgainstDummy), and
  // gets the same error as a wrong password: the endpoint never reveals which
  // emails are registered, by message or by timing.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyAgainstDummy(password)

  if (!user || !passwordOk) apiError(401, 'invalid_credentials')

  // A success wipes this email+IP's failures, and gives back its own hit on
  // the IP-wide counter (without wiping the failures already on it).
  await clearRateLimit(LIMITS.loginFailEmailIp, emailIp)
  await refundRateLimit(LIMITS.loginFailIp, [ip])
  await createSession(event, user.id, remember !== false)

  return toAuthUser(user)
})
