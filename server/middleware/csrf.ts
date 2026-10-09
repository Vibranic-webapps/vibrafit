import { apiError } from '~~/server/utils/errors'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF guard: every write to /api/* must come from this app's own pages.
 *
 * The session cookie is SameSite=Lax, but "site" means the registrable
 * domain: every *.kilianfrederix.net app counts as the SAME site, so an XSS
 * bug or a taken-over subdomain there could still POST with the user's cookie.
 * And readBody also parses plain HTML form posts, so a form on any website
 * could sign a visitor into an attacker's account (login CSRF).
 *
 * Browsers always send Origin on POST/PATCH/DELETE, so it must be present and
 * match the host this request was served on (Vercel sets x-forwarded-host).
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/') || SAFE_METHODS.has(event.method)) return

  const origin = getRequestHeader(event, 'origin')
  let originHost = ''
  try {
    originHost = origin ? new URL(origin).host : ''
  } catch {
    // Malformed Origin (or the literal "null" from sandboxed frames): refuse.
  }

  if (!originHost || originHost !== getRequestHost(event, { xForwardedHost: true })) {
    apiError(403, 'invalid_origin')
  }
})
