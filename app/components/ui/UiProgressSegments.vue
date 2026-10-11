<script setup lang="ts">
/**
 * Session progress: one square segment per exercise (Chalk & Signal: square,
 * not pills). Fill + outline differ per state and the whole strip carries a
 * text label, so meaning never rests on colour alone.
 */
export type SegmentState = 'done' | 'current' | 'pending' | 'skipped'

defineProps<{
  segments: SegmentState[]
  /** Screen-reader summary, e.g. "Exercise 2 of 6, 1 done". Passed in translated. */
  label: string
}>()
</script>

<template>
  <div class="vf-segments" role="img" :aria-label="label">
    <span v-for="(s, i) in segments" :key="i" class="vf-segments__seg" :class="`vf-segments__seg--${s}`" />
  </div>
</template>

<style scoped>
.vf-segments {
  display: flex;
  gap: var(--vf-space-1);
}

.vf-segments__seg {
  flex: 1;
  height: var(--vf-space-2);
  border-radius: var(--vf-radius-none);
  border: var(--vf-border-thin) solid var(--vf-color-control-border);
  background: transparent;
}

.vf-segments__seg--done {
  background: var(--vf-color-good);
  border-color: var(--vf-color-good);
}

.vf-segments__seg--current {
  background: var(--vf-color-accent);
  border-color: var(--vf-color-accent);
}

.vf-segments__seg--skipped {
  border-style: dashed;
  opacity: 0.7;
}
</style>
