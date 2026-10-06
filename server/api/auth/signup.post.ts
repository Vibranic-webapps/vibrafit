import { prisma } from '~~/server/utils/prisma'
import { hashPassword, createSession, toAuthUser } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { assertStrongPassword, cleanName, isValidEmail, normalizeEmail } from '~~/server/utils/validate'
import { NAME_MAX } from '~~/shared/utils/password'
import { clientIp, consumeRateLimit, LIMITS } from '~~/server/utils/rateLimit'

// Signup is OPEN (Kilian's decision): no allowlist, no invite codes.
export default defineEventHandler(async (event) => {
  const { email, password, name } = await readJsonObject(event)

  if (typeof email !== 'string' || typeof password !== 'string') apiError(400, 'invalid_input')
  if (name !== undefined && name !== null && typeof name !== 'string') apiError(400, 'invalid_input')

  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) apiError(400, 'invalid_email')

  // Enforced here, not just in the UI: anyone can POST straight to this
  // endpoint and skip the page's checklist.
  assertStrongPassword(password)

  // Optional: what the app greets you with. Same rules as PATCH /api/auth/me.
  const displayName = typeof name === 'string' ? cleanName(name) : ''
  if (displayName.length > NAME_MAX) apiError(400, 'name_too_long', { max: NAME_MAX })

  // Counted after validation, so typos in the form don't burn attempts, but
  // before the "is this email taken?" lookup, which is what an enumerator wants.
  await consumeRateLimit(event, LIMITS.signupIp, [clientIp(event)])

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
  if (existing) apiError(409, 'email_taken')

  const passwordHash = await hashPassword(password)
  // The unique index is the real guard: two simultaneous signups for the same
  // address both pass the check above, and the second create fails with P2002.
  const user = await prisma.user
    .create({ data: { email: normalizedEmail, passwordHash, name: displayName || null } })
    .catch((e: { code?: string }) => {
      if (e?.code === 'P2002') apiError(409, 'email_taken')
      throw e
    })

  await createSession(event, user.id)

  setResponseStatus(event, 201)
  return toAuthUser(user)
})
