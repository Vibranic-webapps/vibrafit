// Decides who may see which page (ported from Vibravault).

// Reachable without an account.
const PUBLIC_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password', '/design']
// Pointless once signed in: bounce to Home. Not forgot/reset-password: a reset
// link opened in a browser that's still signed in must keep working.
const GUEST_ONLY_PAGES = ['/login', '/signup']

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useAuthUser()

  // Ask the server who we are while we don't know yet.
  if (!user.value) {
    // useRequestFetch forwards the incoming cookies during SSR; a plain $fetch
    // would arrive at /api/auth/me with no session cookie and always get 401.
    const fetchWithCookies = useRequestFetch()
    try {
      user.value = await fetchWithCookies<AuthUser>('/api/auth/me')
    } catch {
      // 401 `not_authenticated` is the normal "nobody" answer.
      user.value = null
    }
  }

  if (!user.value && !PUBLIC_PAGES.includes(to.path)) return navigateTo('/login')
  if (user.value && GUEST_ONLY_PAGES.includes(to.path)) return navigateTo('/')
})
