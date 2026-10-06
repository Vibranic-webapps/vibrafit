<script setup lang="ts">
/**
 * Segmented "how did it feel" control (easy / good / hard). Always shows
 * the word — meaning never relies on colour alone.
 */
type Feeling = 'easy' | 'good' | 'hard'

defineProps<{ modelValue: Feeling | null }>()
const emit = defineEmits<{ 'update:modelValue': [Feeling] }>()

const { t } = useI18n()

const options: { value: Feeling; label: () => string }[] = [
  { value: 'easy', label: () => t('feeling.easy') },
  { value: 'good', label: () => t('feeling.good') },
  { value: 'hard', label: () => t('feeling.hard') },
]
</script>

<template>
  <div class="vf-feeling" role="group" :aria-label="t('feeling.question')">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="vf-feeling__option"
      :class="{ 'vf-feeling__option--active': modelValue === opt.value }"
      :aria-pressed="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label() }}
    </button>
  </div>
</template>

<style scoped>
.vf-feeling {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--vf-space-2);
}

.vf-feeling__option {
  min-height: var(--vf-tap-min);
  border-radius: var(--vf-radius);
  border: var(--vf-border) solid var(--vf-color-control-border);
  background: transparent;
  color: var(--vf-color-text);
  font-family: var(--vf-font-body);
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-base);
  cursor: pointer;
  transition: background var(--vf-duration-base) var(--vf-ease), color var(--vf-duration-base) var(--vf-ease),
    border-color var(--vf-duration-base) var(--vf-ease);
}

.vf-feeling__option--active {
  background: var(--vf-color-text);
  color: var(--vf-color-bg);
  border-color: var(--vf-color-text);
}
</style>
