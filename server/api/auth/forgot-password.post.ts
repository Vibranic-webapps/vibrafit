import { randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { hashToken } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { isValidEmail, normalizeEmail } from '~~/server/utils/validate'
import { sendMail, resetEmail } from '~~/server/utils/mail'
import { clientIp, consumeRateLimit, LIMITS, tryConsumeRateLimit } from '~~/server/utils/rateLimit'

const RESET_TTL_MS = 1000 * 60 * 60 // 1 hour

/** Where reset links point. Production MUST use the configured site URL: the
 *  request's Host header is client-controlled, and trusting it would let an
 *  attacker get a victim's reset link pointed at their own domain. The request
 *  origin is only a dev convenience. */
function siteUrl(event: Parameters<typeof getRequestURL>[0]): string | null {
  const configured = process.env.NUXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  if (configured) return configured
  if (process.env.NODE_ENV !== 'production') return getRequestURL(event).origin
  return null
}

export default defineEventHandler(async (event) => {
  const { email } = await readJsonObject(event)
  if (typeof email !== 'string') apiError(400, 'invalid_input')

  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) apiError(400, 'invalid_email')

  await consumeRateLimit(event, LIMITS.forgotIp, [clientIp(event)])

  // Per-address limit, checked for EVERY address (known or not) and invisible
  // to the caller: answering 429 only for real accounts would leak them.
  const mayMail = await tryConsumeRateLimit(LIMITS.forgotEmail, [normalizedEmail])

  const user = mayMail
    ? await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, email: true } })
    : null

  // Only do work if the account exists - but ALWAYS return the same response.
  // Answering differently for known vs unknown addresses turns this endpoint
  // into a way to enumerate who has an account.
  if (user) {
    const base = siteUrl(event)
    if (!base) {
      console.error('[auth] NUXT_PUBLIC_SITE_URL is not set - cannot build a reset link')
    } else {
      const rawToken = randomBytes(32).toString('hex')

      // Same pattern as sessions: the link carries the raw token, the DB
      // stores only its hash, so a database leak yields no usable reset links.
      await prisma.passwordResetToken.create({
        data: {
          hashedToken: hashToken(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      })

      const { subject, text, html } = resetEmail(`${base}/reset-password?token=${rawToken}`)
      await sendMail({ to: user.email, subject, text, html })
    }
  }

  return { ok: true }
})
