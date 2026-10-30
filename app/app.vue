<script setup lang="ts">
const theme = useTheme()

// <html lang> must follow the app language (screen readers + spellcheck).
// The i18n module doesn't set it on its own; useLocaleHead() provides it.
const i18nHead = useLocaleHead()

useHead({
  htmlAttrs: {
    lang: computed(() => i18nHead.value.htmlAttrs?.lang),
    'data-theme': computed(() => (theme.value === 'system' ? undefined : theme.value)),
  },
})

// Hand off from the loading splash (server/plugins/splash.ts) once the first
// route is resolved and mounted. Never gated on data fetches: the splash has
// its own 8 s Retry fallback.
onNuxtReady(() => {
  ;(window as unknown as { __vbs?: { done: () => void } }).__vbs?.done()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
