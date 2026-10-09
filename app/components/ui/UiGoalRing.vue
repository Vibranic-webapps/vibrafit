<script setup lang="ts">
/**
 * Weekly goal ring. Square line caps (Chalk & Signal reads as a gauge, not
 * a loading spinner). The "done/target" text sits inside so the meaning
 * never depends on reading the fill colour.
 */
const props = withDefaults(
  defineProps<{
    done: number
    target: number
    size?: number
  }>(),
  {
    size: 112,
  }
)

const { t } = useI18n()

const radius = 52
const circumference = 2 * Math.PI * radius

const ratio = computed(() => (props.target > 0 ? Math.min(1, props.done / props.target) : 0))
const dashOffset = computed(() => circumference * (1 - ratio.value))

const label = computed(() => t('ui.goalRing.label', { done: props.done, target: props.target }))
</script>

<template>
  <div class="vf-goalring" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="label">
    <svg viewBox="0 0 120 120">
      <circle class="vf-goalring__track" cx="60" cy="60" :r="radius" fill="none" stroke-width="10" />
      <circle
        class="vf-goalring__fill"
        cx="60"
        cy="60"
        :r="radius"
        fill="none"
        stroke-width="10"
        stroke-linecap="butt"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="vf-goalring__center" aria-hidden="true">
      <span class="vf-num vf-goalring__value">{{ done }}/{{ target }}</span>
    </div>
  </div>
</template>

<style scoped>
.vf-goalring {
  position: relative;
  flex: none;
}

.vf-goalring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  transition: transform var(--vf-duration-base) var(--vf-ease);
}

.vf-goalring__track {
  stroke: var(--vf-color-ring-track);
}

.vf-goalring__fill {
  stroke: var(--vf-color-accent);
  transition: stroke-dashoffset var(--vf-duration-slow) var(--vf-ease);
}

.vf-goalring__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vf-goalring__value {
  font-size: var(--vf-text-lg);
  line-height: 1;
}
</style>
