<script setup lang="ts">
/**
 * Small −/n/+ stepper for "how many" on the equipment screen. The form keeps
 * counts as text (so a half-typed value never fights the user), but a stepper
 * can only produce whole numbers, so this reads the text and writes it back as
 * text. If the stored text isn't a number (can't happen from this control, only
 * from old state) it shows the minimum and the first tap fixes it.
 */
const props = defineProps<{
  modelValue: string
  min: number
  max: number
  /** What is being counted, for the screen reader: "Decrease plate row 1". */
  what: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const value = computed(() => {
  const n = Number.parseInt(props.modelValue, 10)
  return Number.isFinite(n) ? n : props.min
})

function set(n: number) {
  emit('update:modelValue', String(Math.min(props.max, Math.max(props.min, n))))
}
</script>

<template>
  <div class="eq-step" role="group" :aria-label="what">
    <button
      type="button"
      class="eq-step__key"
      :disabled="value <= min"
      :aria-label="t('equipment.stepper.decrease', { what })"
      @click="set(value - 1)"
    >
      <span aria-hidden="true">&minus;</span>
    </button>
    <span class="eq-step__value vf-num" aria-live="polite">{{ value }}</span>
    <button
      type="button"
      class="eq-step__key"
      :disabled="value >= max"
      :aria-label="t('equipment.stepper.increase', { what })"
      @click="set(value + 1)"
    >
      <span aria-hidden="true">+</span>
    </button>
  </div>
</template>

<style scoped>
.eq-step {
  display: inline-flex;
  align-items: center;
  flex: none;
}

.eq-step__key {
  flex: none;
  width: var(--vf-tap-min);
  height: var(--vf-tap-min);
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  font-family: var(--vf-font-body);
  font-size: var(--vf-text-xl);
  font-weight: var(--vf-weight-semibold);
  line-height: 1;
  cursor: pointer;
  transition: opacity var(--vf-duration-base) var(--vf-ease), border-color var(--vf-duration-base) var(--vf-ease);
}

.eq-step__key:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.eq-step__value {
  min-width: var(--vf-space-8);
  text-align: center;
  font-size: var(--vf-text-xl);
}
</style>
