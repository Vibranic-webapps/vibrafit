<script setup lang="ts">
import type { SegmentState } from '~/components/ui/UiProgressSegments.vue'

/**
 * Today, in-progress state: a workout was started and not finished. Resume is
 * the one big button. Counts and progress are null when only the server knows
 * about this workout and the phone could not fetch its details.
 */
const props = defineProps<{
  dayKey: string | null
  done: number | null
  total: number | null
  sets: number | null
  segments: SegmentState[] | null
  busy: boolean
}>()

defineEmits<{ resume: []; finish: [] }>()

const { t } = useI18n()

const name = computed(() => (props.dayKey ? t('today.workoutName', { name: props.dayKey }) : t('today.workoutNameless')))
const progressLabel = computed(() =>
  props.done !== null && props.total !== null
    ? t('workout.progressLabel', { n: Math.min(props.done + 1, props.total), total: props.total, done: props.done })
    : ''
)
</script>

<template>
  <div class="today-progress">
    <UiCard variant="hero">
      <div class="today-progress__stack">
        <div>
          <p class="vf-label">{{ t('today.inProgress') }}</p>
          <p class="vf-display today-progress__title">{{ name }}</p>
          <p v-if="done !== null && total !== null && sets !== null" class="vf-muted today-progress__meta">
            {{ t('today.progressMeta', { done, total, sets }) }}
          </p>
        </div>
        <UiProgressSegments v-if="segments && segments.length" :segments="segments" :label="progressLabel" />
        <UiButton variant="primary" size="xl" full-width :loading="busy" @click="$emit('resume')">{{ t('today.resume') }}</UiButton>
      </div>
    </UiCard>
    <UiButton variant="ghost" full-width :disabled="busy" @click="$emit('finish')">{{ t('today.finishNow') }}</UiButton>
  </div>
</template>

<style scoped>
.today-progress {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-progress__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-progress__title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-2);
}

.today-progress__meta {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}
</style>
