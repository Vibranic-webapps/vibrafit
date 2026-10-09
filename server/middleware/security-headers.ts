/**
 * Security headers on every response (pages, API, assets).
 *
 * - frame-ancestors / X-Frame-Options: no other site may frame the app
 *   (clickjacking the delete-account button on /you).
 * - A full script-src CSP needs nonces, because Nuxt inlines its payload
 *   script. That's a later step (e.g. nuxt-security), not this one.
 * - Reset links carry a token in the URL: /reset-password never sends a Referer.
 *
 * A middleware rather than routeRules: Nuxt 4.5's routeRules types have no
 * `headers`, and this keeps every value in one readable place.
 */
const HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
}

export default defineEventHandler((event) => {
  setResponseHeaders(event, HEADERS)
  if (event.path.startsWith('/reset-password')) setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
})
