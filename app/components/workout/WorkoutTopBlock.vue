<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { SegmentState } from '~/components/ui/UiProgressSegments.vue'

/**
 * Always-visible top of the workout screen: leave (X), the day name, the
 * Pain / Skip button, session progress and the save status. Both buttons sit
 * far from the thumb on purpose, so a sweaty Log tap can't hit them.
 */
defineProps<{
  title: string
  segments: SegmentState[]
  progressLabel: string
  exerciseLabel: string
}>()

defineEmits<{ leave: []; pain: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="wk-top">
    <div class="wk-top__bar">
      <UiIconButton :label="t('workout.leave')" @click="$emit('leave')"><X :size="22" /></UiIconButton>
      <p class="vf-label wk-top__title">{{ title }}</p>
      <UiButton variant="ghost" @click="$emit('pain')">{{ t('workout.painSkip') }}</UiButton>
    </div>
    <UiProgressSegments :segments="segments" :label="progressLabel" />
    <div class="wk-top__meta">
      <span class="vf-muted">{{ exerciseLabel }}</span>
      <WorkoutSyncBadge />
    </div>
  </div>
</template>

<style scoped>
.wk-top {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk-top__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-2);
}

.wk-top__title {
  flex: 1;
  text-align: center;
}

.wk-top__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-2);
  font-size: var(--vf-text-sm);
}
</style>
