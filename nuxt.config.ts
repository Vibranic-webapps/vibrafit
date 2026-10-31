import { launchImageLinks } from './config/launch-images.mjs'

export default defineNuxtConfig({
  // Pins the server runtime (Nitro) behaviour. Move it forward deliberately,
  // with testing, never as a side effect of fixing a warning.
  compatibilityDate: '2025-07-15',

  modules: ['@nuxtjs/i18n'],
  devtools: { enabled: true },

  // App-shell mode: the server sends the same static page (splash + empty app) for every
  // route and never touches the database before the first byte. Who is signed in is asked
  // client-side (app/middleware/auth.global.ts) while the splash covers the screen.
  // Before this, every open waited on Neon (US East, sleeps when idle) = a black screen.
  // All data lives behind /api/* (each route checks the session itself), so nothing here
  // needs server-rendered HTML; the app is private and has no SEO pages.
  ssr: false,

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

  // Security headers: server/middleware/security-headers.ts.

  // No databaseUrl in runtimeConfig: Prisma reads DATABASE_URL from the env
  // itself, and putting it here would bake the password into the build output.

  app: {
    head: {
      // Real <html lang> in the first bytes; the i18n module keeps it in sync after load.
      htmlAttrs: { lang: 'en' },
      // viewport-fit=cover draws edge to edge; CSS keeps content out of the
      // notch / home indicator with env(safe-area-inset-*).
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Vibrafit',
      link: [
        // The manifest makes the app installable (standalone, no browser chrome).
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // iOS ignores manifest icons for the home screen and wants this file.
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // Browser-tab icon: 32px for normal screens, 192px for sharp (retina) screens.
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        // iOS shows one of these instantly when the app is opened from the home screen
        // (before any code loads). Made by config/launch-images.mjs.
        ...launchImageLinks(),
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
