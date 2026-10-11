<script setup lang="ts">
import type { ProgramExercise } from '~/utils/workoutTypes'

/**
 * Today, ready state: the next workout built from the user's equipment, a
 * big Start button (visible without scrolling at 360x640), the 10-minute
 * option, and what's in the workout.
 */
const props = defineProps<{
  dayKey: string | null
  exercises: ProgramExercise[]
  /** Exercises / sets per exercise in the 10-minute version. 0 = no short version. */
  shortExercises: number
  shortSets: number
  starting: boolean
  rebuild: 'idle' | 'busy' | 'done' | 'error'
}>()

defineEmits<{ start: [short: boolean]; rebuild: [] }>()

const { t } = useI18n()
const text = useWorkoutText()

const minutes = computed(() => estimateMinutes(props.exercises))
const name = computed(() => (props.dayKey ? t('today.workoutName', { name: props.dayKey }) : t('today.workoutNameless')))
</script>

<template>
  <div class="today-ready">
    <UiCard variant="hero">
      <div class="today-ready__stack">
        <div>
          <p class="vf-label">{{ t('today.workoutLabel') }}</p>
          <p class="vf-display today-ready__title">{{ name }}</p>
          <p class="vf-muted today-ready__meta">{{ t('today.meta', { n: exercises.length, min: minutes }) }}</p>
        </div>
        <UiButton variant="primary" size="xl" full-width :loading="starting" @click="$emit('start', false)">
          {{ t('today.start') }}
        </UiButton>
      </div>
    </UiCard>

    <template v-if="shortExercises > 0">
      <UiButton variant="ghost" full-width :disabled="starting" @click="$emit('start', true)">{{ t('today.short') }}</UiButton>
      <p class="vf-muted today-ready__meta">{{ t('today.shortMeta', { n: shortExercises, sets: shortSets }) }}</p>
    </template>

    <UiCard>
      <p class="vf-label">{{ t('today.inThisWorkout') }}</p>
      <ul class="today-ready__list">
        <UiExerciseRow v-for="ex in exercises" :key="ex.id" :name="text.name(ex)" :detail="text.detail(ex)" :value="text.load(ex)" />
      </ul>
      <div class="today-ready__links">
        <NuxtLink to="/equipment" class="today-ready__link">{{ t('today.changeEquipment') }}</NuxtLink>
        <button type="button" class="today-ready__link" :disabled="rebuild === 'busy'" @click="$emit('rebuild')">
          {{ rebuild === 'busy' ? t('today.rebuilding') : t('today.rebuild') }}
        </button>
      </div>
      <p v-if="rebuild === 'done'" class="vf-muted today-ready__meta" role="status">{{ t('today.rebuilt') }}</p>
      <p v-else-if="rebuild === 'error'" class="today-ready__error" role="alert">{{ t('today.rebuildError') }}</p>
    </UiCard>
  </div>
</template>

<style scoped>
.today-ready {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-ready__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-ready__title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-2);
}

.today-ready__meta {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.today-ready__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.today-ready__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vf-space-2) var(--vf-space-4);
  margin-top: var(--vf-space-2);
}

.today-ready__link {
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);
  padding: 0;
  background: none;
  border: 0;
  color: var(--vf-color-accent-text);
  font: inherit;
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
  cursor: pointer;
}

.today-ready__link:disabled {
  color: var(--vf-color-muted);
  cursor: default;
}

.today-ready__error {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}
</style>
