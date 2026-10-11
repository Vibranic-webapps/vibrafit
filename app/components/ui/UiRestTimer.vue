<script setup lang="ts">
/**
 * Rest countdown, display only. The page owns the clock (compute `remaining`
 * from an end timestamp so it survives a locked screen) and renders the
 * "+15 s" / "Skip rest" buttons itself.
 *
 * Screen readers: the number is NOT live (a ticking live region is torture).
 * The page announces milestones in its own polite status region instead
 * (start, 10 s left, done). See the Workout mode spec, section A11y.
 */
const props = defineProps<{
  /** Seconds left, >= 0. */
  remaining: number
  /** Seconds the rest started with (grows by 15 per "+15 s"); drives the bar. */
  total: number
  /** Small label above the number, e.g. "Rest". */
  label: string
  /** Replaces `label` at 0, e.g. "Rest over". */
  doneLabel: string
  /** Spoken value for the number, e.g. "1 minute 30 seconds". */
  timeLabel?: string
}>()

const done = computed(() => props.remaining <= 0)

const display = computed(() => {
  const s = Math.max(0, Math.ceil(props.remaining))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
})

const fill = computed(() => (props.total > 0 ? Math.min(1, Math.max(0, props.remaining / props.total)) : 0))
</script>

<template>
  <div class="vf-rest" :class="{ 'vf-rest--done': done }">
    <p class="vf-label vf-rest__label">{{ done ? doneLabel : label }}</p>
    <p class="vf-rest__time vf-num" role="timer" aria-live="off" :aria-label="timeLabel">{{ display }}</p>
    <div class="vf-rest__track" aria-hidden="true">
      <div class="vf-rest__bar" :style="{ transform: `scaleX(${fill})` }" />
    </div>
  </div>
</template>

<style scoped>
.vf-rest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vf-space-2);
  text-align: center;
}

.vf-rest__time {
  margin: 0;
  font-size: var(--vf-text-huge);
  line-height: 0.9;
}

.vf-rest--done .vf-rest__label {
  color: var(--vf-color-good);
}

.vf-rest__track {
  width: 100%;
  height: var(--vf-space-2);
  margin-top: var(--vf-space-2);
  background: var(--vf-color-ring-track);
  border-radius: var(--vf-radius-none);
  overflow: hidden;
}

.vf-rest__bar {
  height: 100%;
  background: var(--vf-color-accent);
  transform-origin: left center;
}

.vf-rest--done .vf-rest__bar {
  background: var(--vf-color-good);
}
</style>
