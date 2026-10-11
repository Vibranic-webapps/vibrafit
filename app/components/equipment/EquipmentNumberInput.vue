<script setup lang="ts">
/**
 * Compact numeric input for the equipment form. UiField is text-only (no
 * inputmode), and gear weights are typed on a phone, so this brings up the
 * decimal / number keypad. Styled with the same tokens as UiField.
 * The value stays a string while typing ("1." is a valid half-typed number).
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    /** 'kg' = decimal keypad, 'count' = whole-number keypad. */
    mode: 'kg' | 'count'
    unit?: string
    error?: string | null
    hint?: string
  }>(),
  { unit: undefined, error: null, hint: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = useId()
const inputEl = ref<HTMLInputElement | null>(null)

const describedBy = computed(() => {
  if (props.error) return `${id}-error`
  if (props.hint) return `${id}-hint`
  return undefined
})

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<template>
  <div class="eq-num" :class="{ 'eq-num--invalid': !!error }">
    <label class="vf-label" :for="id">{{ label }}</label>
    <div class="eq-num__wrap">
      <input
        :id="id"
        ref="inputEl"
        class="eq-num__control vf-num"
        type="text"
        :inputmode="mode === 'kg' ? 'decimal' : 'numeric'"
        autocomplete="off"
        :value="modelValue"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <span v-if="unit" class="eq-num__unit vf-muted" aria-hidden="true">{{ unit }}</span>
    </div>
    <p v-if="error" :id="`${id}-error`" class="eq-num__msg eq-num__msg--error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="eq-num__msg vf-muted">{{ hint }}</p>
  </div>
</template>

<style scoped>
.eq-num {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  min-width: 0;
}

.eq-num__wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.eq-num__control {
  width: 100%;
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-2) var(--vf-space-4);
  padding-right: var(--vf-space-12);
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  font-size: var(--vf-text-lg);
}

.eq-num__unit {
  position: absolute;
  right: var(--vf-space-4);
  font-size: var(--vf-text-sm);
  pointer-events: none;
}

.eq-num--invalid .eq-num__control {
  border-color: var(--vf-color-hard);
}

.eq-num__msg {
  margin: 0;
  font-size: var(--vf-text-sm);
}

.eq-num__msg--error {
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}
</style>
