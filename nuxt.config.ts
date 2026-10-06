export default defineNuxtConfig({
  // Pins the server runtime (Nitro) behaviour. Move it forward deliberately,
  // with testing, never as a side effect of fixing a warning.
  compatibilityDate: '2025-07-15',

  modules: ['@nuxtjs/i18n'],
  devtools: { enabled: true },

  // Own dev port. Browsers key service workers, localStorage and cookies per
  // origin (incl. port), so every Vibranic app gets its own:
  // VibraFlow / Vibradex / portfolio 3000 · Vibravault 3002 · Vibrafit 3003.
  devServer: { port: 3003 },
  typescript: { strict: true },

  // Fonts are self-hosted (fontsource), never loaded from Google's CDN:
  // that sends every visitor's IP to Google, which EU courts ruled a GDPR problem.
  // Barlow Condensed = headings + every number. Barlow = body text.
  css: [
    '@fontsource/barlow/400.css',
    '@fontsource/barlow/500.css',
    '@fontsource/barlow/600.css',
    '@fontsource/barlow-condensed/600.css',
    '@fontsource/barlow-condensed/700.css',
    '@fontsource/barlow-condensed/800.css',
    '~/assets/css/main.css',
  ],

  // English only in v1, but EVERY string goes through i18n so Dutch can be
  // added later by dropping in nl.json (+ one line below), without a refactor.
  // no_prefix: an app opened from a home-screen icon doesn't need /en/ URLs.
  i18n: {
    strategy: 'no_prefix',
    baseUrl: 'https://vibrafit.kilianfrederix.net',
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-GB', name: 'English', file: 'en.json' }],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'vf-lang',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },

  app: {
    head: {
      // viewport-fit=cover draws edge to edge; CSS keeps content out of the
      // notch / home indicator with env(safe-area-inset-*).
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Vibrafit',
      link: [
        // The manifest makes the app installable (standalone, no browser chrome).
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Vibrafit' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        // Tints the system bars to match each theme's background (Chalk & Signal bg tokens).
        { name: 'theme-color', content: '#F1F3F2', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0E1110', media: '(prefers-color-scheme: dark)' },
      ],
    },
  },
})
