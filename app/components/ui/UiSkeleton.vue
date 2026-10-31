<script setup lang="ts">
/**
 * One loading placeholder shape (Chalk & Signal): a flat track fill with a
 * hairline border and a slow orange-tinted sweep. No text, no shadow.
 *
 * - `line`   text line / heading: square corners
 * - `chip`   chips, set boxes, week-strip dots: the small radius
 * - `block`  cards and buttons: the app radius
 * - `circle` the goal ring (hollow, like the real one)
 *
 * It is decorative (aria-hidden). The screen that shows skeletons owns ONE
 * `role="status"` wrapper with a translated label. Size each skeleton to the
 * content it stands in for, so nothing moves when the real thing arrives.
 * `index` staggers the sweep (70 ms per step) so the shapes shimmer in turn.
 * With reduced motion the sweep stops and the placeholder stays still.
 */
export type SkeletonShape = 'line' | 'chip' | 'block' | 'circle'

withDefaults(
  defineProps<{
    shape?: SkeletonShape
    /** Any CSS length or percentage. Omit to fill the parent. */
    width?: string
    height?: string
    index?: number
  }>(),
  { shape: 'line', width: undefined, height: undefined, index: 0 }
)
</script>

<template>
  <span
    class="vf-sk"
    :class="`vf-sk--${shape}`"
    :style="{ width, height, '--vf-sk-i': index }"
    aria-hidden="true"
  />
</template>

<style scoped>
.vf-sk {
  position: relative;
  display: block;
  flex: none;
  overflow: hidden;
  box-sizing: border-box;
  border: var(--vf-border-thin) solid var(--vf-color-border);
  background: var(--vf-color-ring-track);
  border-radius: var(--vf-radius-none);
}

/* The sweep moves with transform only, so it never triggers layout or paint. */
.vf-sk::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 34%, var(--vf-color-skeleton-sweep) 50%, transparent 66%);
  transform: translateX(-100%);
  animation: vf-sk-sweep var(--vf-duration-shimmer) cubic-bezier(0.4, 0, 0.6, 1) calc(var(--vf-sk-i, 0) * 70ms) infinite;
}

.vf-sk--chip {
  border-radius: var(--vf-radius-sm);
}

.vf-sk--block {
  border-radius: var(--vf-radius);
}

.vf-sk--circle {
  border-radius: 50%;
  aspect-ratio: 1;
  /* Hollow centre, like the ring it stands in for. */
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 63%);
  mask: radial-gradient(circle, transparent 62%, #000 63%);
}

@keyframes vf-sk-sweep {
  0% {
    transform: translateX(-100%);
  }

  65%,
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vf-sk::after {
    animation: none;
    display: none;
  }
}
</style>
