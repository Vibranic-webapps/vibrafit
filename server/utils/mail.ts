/**
 * Email sending via Resend (same approach as Vibravault).
 *
 * Degrades deliberately: with no RESEND_API_KEY set, it logs the message
 * instead of throwing. That means the whole password-reset flow is testable
 * locally, and a missing key in production can never turn "forgot password"
 * into a 500 - the user still gets the same neutral response either way.
 *
 * (Vibradex error reporting for failed sends comes with telemetry in phase 3.)
 */

interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendMail({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM ?? 'Vibrafit <noreply@kilianfrederix.net>'

  if (!apiKey) {
    console.warn('[mail] RESEND_API_KEY not set - logging instead of sending')
    console.warn(`[mail] to=${to} subject=${subject}\n${text}`)
    return
  }

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: { from, to, subject, html, text },
    })
  } catch (e) {
    // Never surface a mail failure to the CALLER: /api/auth/forgot-password
    // must answer identically whether or not the address exists, and whether
    // or not the provider is having a bad day. But it must not vanish either:
    // a rejected Resend key or an unverified domain would otherwise be invisible.
    console.error('[mail] send failed', e instanceof Error ? e.message : e)
  }
}

// English only for now, like the rest of v1. When Dutch arrives, the mail
// needs the user's locale passed in (the API can't see the i18n cookie choice
// reliably for a logged-out user).
// Colours are the Chalk & Signal light tokens, inlined because mail clients
// don't support CSS variables.
export function resetEmail(link: string) {
  const text = `Reset your Vibrafit password:\n\n${link}\n\n`
    + `This link works once and expires in 1 hour.\n`
    + `If you did not ask for this, ignore this email - nothing has changed.`

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
              background:#F1F3F2;padding:32px;color:#111513">
    <div style="max-width:460px;margin:0 auto;background:#FFFFFF;border:1px solid #D5DAD7;
                border-radius:16px;padding:32px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.14em;
                text-transform:uppercase;color:#B93A0B">Vibrafit</p>
      <h1 style="margin:0 0 12px;font-size:22px">Reset your password</h1>
      <p style="margin:0 0 22px;font-size:15px;color:#505955">
        Click below to choose a new password. The link works once and expires in 1 hour.
      </p>
      <a href="${link}"
         style="display:inline-block;padding:13px 22px;background:#F04E12;color:#111513;
                font-weight:600;font-size:15px;text-decoration:none;border-radius:12px">
        Choose a new password
      </a>
      <p style="margin:22px 0 0;font-size:13px;color:#505955">
        If you did not ask for this, ignore this email &mdash; nothing has changed.
      </p>
    </div>
  </div>`

  return { subject: 'Reset your Vibrafit password', text, html }
}
