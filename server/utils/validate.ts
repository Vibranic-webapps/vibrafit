import { apiError } from './errors'
import { passwordProblems } from '~~/shared/utils/password'

// Input rules for the auth API, in one place.
//
// Password rules (same as Vibravault's) live in shared/utils/password.ts so the
// signup checklist and the server use the exact same rules.

export const EMAIL_MAX = 254 // the practical limit for an address (RFC 5321 path)
// bcrypt only looks at the first 72 BYTES. Anything longer would be silently
// truncated, so "my long passphrase + anything" would also log in. Refuse it.
export const PASSWORD_MAX_BYTES = 72

/** 400 unless the password passes every rule and fits in bcrypt. */
export function assertStrongPassword(value: string): void {
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
    apiError(400, 'password_too_long', { max: PASSWORD_MAX_BYTES })
  }
  const problems = passwordProblems(value)
  if (problems.length) apiError(400, 'weak_password', { problems })
}

/** Emails are stored trimmed + lowercased, so lookups must normalize the same way. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

// Deliberately loose: "something@something.tld", no spaces. Real validation
// of an address is "can it receive the reset mail", not a regex.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_SHAPE.test(email)
}

/** Collapse whitespace, trim; empty means "no name". Same rule at signup and PATCH /me. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}
