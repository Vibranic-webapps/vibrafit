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
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
