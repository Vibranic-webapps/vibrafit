// Decides who may see which page (ported from Vibravault).

// Reachable without an account.
const PUBLIC_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password', '/design']
// Pointless once signed in: bounce to Home. Not forgot/reset-password: a reset
// link opened in a browser that's still signed in must keep working.
const GUEST_ONLY_PAGES = ['/login', '/signup']

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useAuthUser()
  // One "who am I" question per page load, not one per navigation (a signed-out visit to a
  // private page redirects to /login, which must not ask again).
  const asked = useState('auth-asked', () => false)

  // Ask the server who we are while we don't know yet. This runs in the browser only
  // (nuxt.config `ssr: false`), behind the loading splash; the browser sends the session
  // cookie itself. The guard is for navigation only: every /api route checks the session.
  if (!user.value && !asked.value) {
    asked.value = true
    try {
      user.value = await $fetch<AuthUser>('/api/auth/me')
    } catch {
      // 401 `not_authenticated` is the normal "nobody" answer.
      user.value = null
    }
  }

  if (!user.value && !PUBLIC_PAGES.includes(to.path)) return navigateTo('/login')
  if (user.value && GUEST_ONLY_PAGES.includes(to.path)) return navigateTo('/')
})
