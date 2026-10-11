<script setup lang="ts">
/**
 * Count-up display for timed exercises (plank). Display only: the page owns
 * the clock and the Start / Stop / Log button (the same 72px thumb button
 * that says "Log set" for rep exercises). After Stop, the page swaps this
 * for a UiStepper (step 5, unit "sec") so a wrong time can be corrected.
 */
const props = defineProps<{
  /** Elapsed seconds. */
  seconds: number
  running: boolean
  /** Goal in seconds (the low end of the range); drives the bar. Omit for no bar. */
  target?: number
  /** Status word under the number, e.g. "Ready", "Hold", "Target reached". */
  statusLabel: string
  /** Spoken value for the number, e.g. "25 seconds". */
  timeLabel?: string
}>()

const display = computed(() => {
  const s = Math.max(0, Math.floor(props.seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

const reached = computed(() => props.target !== undefined && props.seconds >= props.target)
const fill = computed(() => (props.target ? Math.min(1, Math.max(0, props.seconds / props.target)) : 0))
</script>

<template>
  <div class="vf-hold" :class="{ 'vf-hold--reached': reached, 'vf-hold--running': running }">
    <p class="vf-hold__time vf-num" role="timer" aria-live="off" :aria-label="timeLabel">{{ display }}</p>
    <p class="vf-label vf-hold__status">{{ statusLabel }}</p>
    <div v-if="target" class="vf-hold__track" aria-hidden="true">
      <div class="vf-hold__bar" :style="{ transform: `scaleX(${fill})` }" />
    </div>
  </div>
</template>

<style scoped>
.vf-hold {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vf-space-1);
  text-align: center;
}

.vf-hold__time {
  margin: 0;
  font-size: var(--vf-text-huge);
  line-height: 0.9;
}

.vf-hold--reached .vf-hold__status {
  color: var(--vf-color-good);
}

.vf-hold__track {
  width: 100%;
  height: var(--vf-space-2);
  margin-top: var(--vf-space-2);
  background: var(--vf-color-ring-track);
  border-radius: var(--vf-radius-none);
  overflow: hidden;
}

.vf-hold__bar {
  height: 100%;
  background: var(--vf-color-accent);
  transform-origin: left center;
}

.vf-hold--reached .vf-hold__bar {
  background: var(--vf-color-good);
}
</style>
