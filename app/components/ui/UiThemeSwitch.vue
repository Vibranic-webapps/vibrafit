<script setup lang="ts">
/**
 * System / light / dark segmented switch. Writes straight to the
 * `vf-theme` cookie via useTheme() — app.vue reads that cookie to set
 * data-theme on <html>, so light/dark truly are two designed palettes,
 * never one inverted into the other.
 */
import type { Theme } from '~/composables/useTheme'

const theme = useTheme()
const { t } = useI18n()

const options: { value: Theme; label: () => string }[] = [
  { value: 'system', label: () => t('ui.theme.system') },
  { value: 'light', label: () => t('ui.theme.light') },
  { value: 'dark', label: () => t('ui.theme.dark') },
]
</script>

<template>
  <div class="vf-themeswitch" role="group" :aria-label="t('ui.theme.label')">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="vf-themeswitch__option"
      :class="{ 'vf-themeswitch__option--active': theme === opt.value }"
      :aria-pressed="theme === opt.value"
      @click="theme = opt.value"
    >
      {{ opt.label() }}
    </button>
  </div>
</template>

<style scoped>
.vf-themeswitch {
  display: inline-flex;
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  padding: var(--vf-space-half);
  gap: var(--vf-space-half);
}

.vf-themeswitch__option {
  min-height: var(--vf-tap-min);
  min-width: var(--vf-size-segment-min);
  padding: var(--vf-space-1) var(--vf-space-3);
  border-radius: var(--vf-radius-sm);
  border: 0;
  background: transparent;
  color: var(--vf-color-text);
  font-family: var(--vf-font-body);
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-sm);
  cursor: pointer;
  transition: background var(--vf-duration-base) var(--vf-ease), color var(--vf-duration-base) var(--vf-ease);
}

.vf-themeswitch__option--active {
  background: var(--vf-color-accent);
  color: var(--vf-color-on-accent);
}
</style>
