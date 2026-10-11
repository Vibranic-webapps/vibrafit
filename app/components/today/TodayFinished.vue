<script setup lang="ts">
/**
 * Today, finished state. No Start button on purpose: rest is part of training.
 * "Next up" only names the next workout.
 */
const props = defineProps<{
  dayKey: string | null
  /** null when unknown (only the server knows about this workout). */
  exercises: number | null
  sets: number
  nextDayKey: string | null
}>()

defineEmits<{ summary: [] }>()

const { t } = useI18n()

const meta = computed(() => {
  const day = props.dayKey ? t('today.workoutName', { name: props.dayKey }) : t('today.workoutNameless')
  return props.exercises === null
    ? t('today.doneMetaNoExercises', { day, sets: props.sets })
    : t('today.doneMeta', { day, n: props.exercises, sets: props.sets })
})
const nextName = computed(() => (props.nextDayKey ? t('today.workoutName', { name: props.nextDayKey }) : t('today.workoutNameless')))
</script>

<template>
  <div class="today-done">
    <UiCard variant="hero">
      <div class="today-done__stack">
        <div>
          <p class="vf-label">{{ t('today.doneLabel') }}</p>
          <p class="vf-display today-done__title">{{ t('today.doneTitle') }}</p>
          <p class="vf-muted today-done__meta">{{ meta }}</p>
        </div>
        <UiButton variant="secondary" full-width @click="$emit('summary')">{{ t('today.seeSummary') }}</UiButton>
      </div>
    </UiCard>
    <UiCard>
      <p class="vf-label">{{ t('today.nextUp') }}</p>
      <p class="vf-display today-done__title">{{ nextName }}</p>
      <p class="vf-muted today-done__meta">{{ t('today.nextBody') }}</p>
    </UiCard>
  </div>
</template>

<style scoped>
.today-done {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-done__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-done__title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-2);
}

.today-done__meta {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}
</style>
