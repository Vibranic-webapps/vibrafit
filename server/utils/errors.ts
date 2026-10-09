import type { H3Event } from 'h3'

/**
 * Every error the auth API can answer with.
 *
 * The server never sends user-facing sentences: `statusMessage` is one of
 * these stable codes, and the app maps it to an i18n string. That keeps all
 * copy in en.json (and later nl.json), and lets the wording change without
 * touching the API. Read it on the client with app/utils/serverMessage.ts.
 */
export type ApiErrorCode =
  | 'invalid_input' // body missing, not JSON, or a field has the wrong type
  | 'invalid_email'
  | 'weak_password' // data.problems lists the failed rule ids
  | 'password_too_long'
  | 'name_too_long'
  | 'email_taken'
  | 'invalid_credentials'
  | 'not_authenticated'
  | 'wrong_password' // signed in, but the current password typed is wrong
  | 'invalid_reset_token'
  | 'rate_limited' // data.retryAfter = seconds; also a Retry-After header
  | 'invalid_origin' // a write to /api/* that didn't come from this app's own pages

export function apiError(
  statusCode: number,
  code: ApiErrorCode,
  data?: Record<string, unknown>,
): never {
  throw createError({ statusCode, statusMessage: code, data })
}

/**
 * The request body as a plain object, or a 400.
 *
 * readBody throws its own (English) error on malformed JSON and returns
 * undefined on an empty body; both become `invalid_input` here so every
 * endpoint can just destructure and type-check the fields it needs.
 */
export async function readJsonObject(event: H3Event): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    apiError(400, 'invalid_input')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) apiError(400, 'invalid_input')
  return body as Record<string, unknown>
}
