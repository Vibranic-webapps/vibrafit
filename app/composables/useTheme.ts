export type Theme = 'system' | 'light' | 'dark'

/**
 * Theme preference (system / light / dark), stored in a cookie rather than
 * localStorage so the SERVER knows it too: app.vue renders `data-theme` into
 * the first HTML response, so there's no flash of the wrong theme.
 *
 * 'system' writes no attribute and the `prefers-color-scheme` media query decides.
 */
export const useTheme = () =>
  useCookie<Theme>('vf-theme', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })
