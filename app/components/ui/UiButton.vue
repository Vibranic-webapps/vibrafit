<script setup lang="ts">
/**
 * Primary UI action. Presentational only — no data fetching, no routing.
 * Renders a real <button> (or an <a> when `href` is set) so it's keyboard
 * and screen-reader native for free.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    fullWidth?: boolean
    disabled?: boolean
    loading?: boolean
    /** Renders an <a> instead of a <button> when provided. */
    href?: string
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    fullWidth: false,
    disabled: false,
    loading: false,
    href: undefined,
    type: 'button',
  }
)

defineEmits<{ click: [MouseEvent] }>()

const { t } = useI18n()

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <a
    v-if="href && !isDisabled"
    :href="href"
    class="vf-btn"
    :class="[`vf-btn--${variant}`, { 'vf-btn--full': fullWidth }]"
  >
    <slot />
  </a>
  <button
    v-else
    :type="type"
    class="vf-btn"
    :class="[`vf-btn--${variant}`, { 'vf-btn--full': fullWidth, 'vf-btn--loading': loading }]"
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : undefined"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="vf-btn__spinner" aria-hidden="true" />
    <span v-if="loading" class="vf-visually-hidden">{{ t('ui.loading') }}</span>
    <span class="vf-btn__label" :class="{ 'vf-btn__label--hidden': loading }"><slot /></span>
  </button>
</template>

<style scoped>
.vf-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--vf-space-2);
  min-height: var(--vf-tap-min);
  min-width: var(--vf-tap-min);
  padding: var(--vf-space-3) var(--vf-space-6);
  border-radius: var(--vf-radius);
  border: var(--vf-border) solid transparent;
  font-family: var(--vf-font-body);
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-base);
  text-transform: uppercase;
  letter-spacing: var(--vf-button-track);
  text-decoration: none;
  cursor: pointer;
  transition: background var(--vf-duration-base) var(--vf-ease), border-color var(--vf-duration-base) var(--vf-ease),
    color var(--vf-duration-base) var(--vf-ease), opacity var(--vf-duration-base) var(--vf-ease);
}

.vf-btn--full {
  width: 100%;
}

.vf-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Primary: the one obvious next step on the screen. */
.vf-btn--primary {
  background: var(--vf-color-accent);
  color: var(--vf-color-on-accent);
}

.vf-btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

/* Secondary: supporting action, still clearly a button. */
.vf-btn--secondary {
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  border-color: var(--vf-color-control-border);
}

/* Ghost: lowest-emphasis action (e.g. "skip", "short on time"). */
.vf-btn--ghost {
  background: transparent;
  color: var(--vf-color-text);
  border-color: var(--vf-color-control-border);
}

/* Danger: destructive/stop action (end workout, delete). */
.vf-btn--danger {
  background: transparent;
  color: var(--vf-color-hard);
  border-color: var(--vf-color-hard);
}

.vf-btn__label--hidden {
  opacity: 0;
}

.vf-btn__spinner {
  position: absolute;
  width: var(--vf-size-spinner);
  height: var(--vf-size-spinner);
  border-radius: 50%;
  border: var(--vf-border-thick) solid currentColor;
  border-top-color: transparent;
  animation: vf-spin 700ms linear infinite;
}

@keyframes vf-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
