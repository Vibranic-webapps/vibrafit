<script setup lang="ts">
/**
 * THE text/email/password input primitive. Label is always visible (no
 * placeholder-as-label), and a hint OR an error renders below it, wired up
 * via aria-describedby so screen readers announce the right one.
 * type="password" gets a show/hide toggle with its own i18n aria-label.
 *
 * Every form field in the app should use this instead of a raw <input> —
 * add a prop here if a screen needs something this doesn't do yet.
 */
import { Eye, EyeOff } from 'lucide-vue-next'

type FieldType = 'text' | 'email' | 'password'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: FieldType
    hint?: string
    error?: string | null
    autocomplete?: string
    required?: boolean
    maxlength?: number
    disabled?: boolean
  }>(),
  {
    type: 'text',
    hint: undefined,
    error: null,
    autocomplete: undefined,
    required: false,
    maxlength: undefined,
    disabled: false,
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()

const id = useId()
const inputEl = ref<HTMLInputElement | null>(null)
const revealed = ref(false)

const describedBy = computed(() => {
  if (props.error) return `${id}-error`
  if (props.hint) return `${id}-hint`
  return undefined
})

// Only a password field can be revealed; every other type keeps its own type.
const resolvedType = computed(() => (props.type === 'password' && revealed.value ? 'text' : props.type))

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

// Lets a parent form move focus here after a failed submit (ease-of-use:
// "focus moves to the first invalid field").
defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<template>
  <div class="vf-field" :class="{ 'vf-field--invalid': !!error }">
    <label class="vf-label vf-field__label" :for="id">{{ label }}</label>

    <div class="vf-field__wrap">
      <input
        :id="id"
        ref="inputEl"
        class="vf-field__control"
        :class="{ 'vf-field__control--pw': type === 'password' }"
        :type="resolvedType"
        :value="modelValue"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        @input="onInput"
      >
      <button
        v-if="type === 'password'"
        type="button"
        class="vf-field__toggle"
        :aria-label="revealed ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')"
        :aria-pressed="revealed"
        @click="revealed = !revealed"
      >
        <component :is="revealed ? EyeOff : Eye" :size="20" aria-hidden="true" />
      </button>
    </div>

    <p v-if="error" :id="`${id}-error`" class="vf-field__msg vf-field__msg--error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="vf-field__msg vf-muted">{{ hint }}</p>
  </div>
</template>

<style scoped>
.vf-field {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
}

.vf-field__wrap {
  position: relative;
  display: flex;
}

.vf-field__control {
  flex: 1;
  width: 100%;
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-3) var(--vf-space-4);
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  font-family: var(--vf-font-body);
  font-size: var(--vf-text-base);
}

/* Room for the show/hide toggle so typed text never runs under it. */
.vf-field__control--pw {
  padding-right: var(--vf-space-12);
}

.vf-field__control:disabled {
  opacity: 0.6;
}

.vf-field--invalid .vf-field__control {
  border-color: var(--vf-color-hard);
}

.vf-field__toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-tap-min);
  height: var(--vf-tap-min);
  background: transparent;
  border: 0;
  color: var(--vf-color-muted);
  cursor: pointer;
}

.vf-field__msg {
  margin: 0;
  font-size: var(--vf-text-sm);
}

.vf-field__msg--error {
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}
</style>
