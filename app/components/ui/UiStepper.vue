<script setup lang="ts">
/**
 * Big −/value/+ stepper for reps or load. Mid-workout, this is read from
 * arm's length and tapped with one hand — the number stays huge and
 * tabular so it never re-flows, and every change is announced for screen
 * readers via aria-live.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    /** Unit label shown under the number and used in the +/- aria-labels, e.g. "reps" or "kg". */
    unit?: string
  }>(),
  {
    min: 0,
    max: 999,
    step: 1,
    unit: '',
  }
)

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const { t } = useI18n()

function clamp(n: number) {
  return Math.min(props.max, Math.max(props.min, n))
}

function decrease() {
  if (props.modelValue <= props.min) return
  emit('update:modelValue', clamp(props.modelValue - props.step))
}

function increase() {
  if (props.modelValue >= props.max) return
  emit('update:modelValue', clamp(props.modelValue + props.step))
}

const decreaseLabel = computed(() => t('ui.stepper.decrease', { unit: props.unit }))
const increaseLabel = computed(() => t('ui.stepper.increase', { unit: props.unit }))
</script>

<template>
  <div class="vf-stepper">
    <button
      type="button"
      class="vf-stepper__key"
      :disabled="modelValue <= min"
      :aria-label="decreaseLabel"
      @click="decrease"
    >
      <span aria-hidden="true">&minus;</span>
    </button>

    <div class="vf-stepper__value">
      <span class="vf-stepper__number vf-num" aria-live="polite">{{ modelValue }}</span>
      <span v-if="unit" class="vf-stepper__unit vf-label">{{ unit }}</span>
    </div>

    <button
      type="button"
      class="vf-stepper__key"
      :disabled="modelValue >= max"
      :aria-label="increaseLabel"
      @click="increase"
    >
      <span aria-hidden="true">+</span>
    </button>
  </div>
</template>

<style scoped>
.vf-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-3);
}

.vf-stepper__key {
  flex: none;
  width: var(--vf-size-stepper-key);
  height: var(--vf-size-stepper-key);
  min-width: var(--vf-tap-min);
  min-height: var(--vf-tap-min);
  border-radius: var(--vf-radius);
  border: var(--vf-border) solid var(--vf-color-control-border);
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  font-family: var(--vf-font-body);
  font-size: var(--vf-text-xl);
  font-weight: var(--vf-weight-semibold);
  line-height: 1;
  cursor: pointer;
  transition: opacity var(--vf-duration-base) var(--vf-ease), border-color var(--vf-duration-base) var(--vf-ease);
}

.vf-stepper__key:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.vf-stepper__value {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.vf-stepper__number {
  font-size: var(--vf-text-huge);
  line-height: 0.9;
}

.vf-stepper__unit {
  margin-top: var(--vf-space-1);
}
</style>
