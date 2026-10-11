<script setup lang="ts">
import { Check, TriangleAlert, X } from 'lucide-vue-next'

/**
 * One exercise in a list (Today preview, end-of-workout summary).
 * Render inside a <ul>. Left: name + detail ("3 × 10–12"). Right: load or
 * result. Non-default states show an icon AND a visible word via
 * `stateLabel`, so they read without colour.
 */
export type ExerciseRowState = 'default' | 'done' | 'skipped' | 'pain'

withDefaults(
  defineProps<{
    name: string
    /** Muted second line, e.g. "3 × 10–12" or "3 × 10 per side". */
    detail?: string
    /** Right-hand value, e.g. "7.85 kg", "Bodyweight", or a result "10 · 10 · 9". */
    value?: string
    state?: ExerciseRowState
    /** Visible state word, e.g. "Skipped", "Stopped for pain". Required for non-default states. */
    stateLabel?: string
  }>(),
  { detail: undefined, value: undefined, state: 'default', stateLabel: undefined }
)
</script>

<template>
  <li class="vf-exrow" :class="`vf-exrow--${state}`">
    <span v-if="state !== 'default'" class="vf-exrow__icon" aria-hidden="true">
      <Check v-if="state === 'done'" :size="16" />
      <X v-else-if="state === 'skipped'" :size="14" />
      <TriangleAlert v-else :size="16" />
    </span>
    <span class="vf-exrow__main">
      <span class="vf-exrow__name">{{ name }}</span>
      <span v-if="detail || stateLabel" class="vf-exrow__detail vf-muted">
        <span v-if="stateLabel" class="vf-exrow__state">{{ stateLabel }}<template v-if="detail"> · </template></span>{{ detail }}
      </span>
    </span>
    <span v-if="value" class="vf-exrow__value vf-num">{{ value }}</span>
  </li>
</template>

<style scoped>
.vf-exrow {
  display: flex;
  align-items: center;
  gap: var(--vf-space-3);
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-3) 0;
  border-bottom: var(--vf-border-thin) solid var(--vf-color-border);
  list-style: none;
}

.vf-exrow:last-child {
  border-bottom: 0;
}

.vf-exrow__icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-size-dot-sm);
  height: var(--vf-size-dot-sm);
  border-radius: var(--vf-radius-sm);
  border: var(--vf-border-thick) solid var(--vf-color-control-border);
  color: var(--vf-color-muted);
}

.vf-exrow--done .vf-exrow__icon {
  background: var(--vf-color-good);
  border-color: var(--vf-color-good);
  color: var(--vf-color-on-good);
}

.vf-exrow--skipped .vf-exrow__icon {
  border-style: dashed;
}

.vf-exrow--pain .vf-exrow__icon {
  border-color: var(--vf-color-hard);
  color: var(--vf-color-hard);
}

.vf-exrow__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.vf-exrow__name {
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-md);
  line-height: var(--vf-leading-snug);
}

.vf-exrow__detail {
  font-size: var(--vf-text-sm);
}

.vf-exrow--pain .vf-exrow__state {
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}

.vf-exrow__value {
  flex: none;
  font-size: var(--vf-text-lg);
  text-align: right;
}
</style>
