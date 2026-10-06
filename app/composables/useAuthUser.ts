/** What every auth endpoint returns for "the signed-in user"
 *  (toAuthUser in server/utils/auth.ts). */
export interface AuthUser {
  id: string
  email: string
  name: string | null
}

/** Shared, SSR-safe auth state. useState survives hydration, so the server's
 *  answer isn't thrown away and re-fetched on the client.
 *  After login/signup/reset, set it from the response; after logout or
 *  account deletion, set it to null. */
export const useAuthUser = () => useState<AuthUser | null>('auth-user', () => null)
