/**
 * Loading splash: injected into the server-rendered HTML before #__nuxt, so it paints
 * from the first byte and hydration never touches it. Template: server/assets/splash.html.
 * Hand-off: app/app.vue calls window.__vbs.done() once the first route is ready.
 * Spec: vault > vibrafit > 03 Design > loading-screens > Loading Screen Spec.
 */
import en from '../../i18n/locales/en.json'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Splash strings come from the default locale file (one source for every string).
// The splash is built once per process, not per request.
let cached: string | null = null

async function buildSplash(): Promise<string> {
  if (cached) return cached
  const template = (await useStorage('assets:server').getItem<string>('splash.html')) ?? ''
  const strings = en.splash as Record<string, string>
  cached = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(strings[key] ?? ''))
  return cached
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', async (html) => {
    html.bodyPrepend.unshift(await buildSplash())
  })
})
