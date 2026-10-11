<script setup lang="ts">
import type { DraftExercise } from '~/utils/workoutDraft'
import type { Feeling } from '~/utils/workoutTypes'

/**
 * "Log a set" for rep exercises: stepper (prefilled), optional feeling, and
 * the one thumb button. The parent remounts this (via :key) for every set, so
 * the feeling always starts empty and the stepper starts at `initialAmount`.
 */
const props = defineProps<{
  exercise: DraftExercise
  setNumber: number
  loggedNumbers: number[]
  initialAmount: number
  initialFeeling?: Feeling | null
  painNotice?: boolean
  /** Correcting an earlier set: offer a way back. */
  fixing?: boolean
}>()

const emit = defineEmits<{ log: [amount: number, feeling: Feeling | null]; cancel: [] }>()

const { t } = useI18n()

const amount = ref(props.initialAmount)
const feeling = ref<Feeling | null>(props.initialFeeling ?? null)

const unit = computed(() => t(props.exercise.perSide ? 'workout.repsPerSideUnit' : 'workout.repsUnit'))

function submit() {
  if (amount.value <= 0) return
  emit('log', amount.value, feeling.value)
}
</script>

<template>
  <WorkoutStep>
    <WorkoutExerciseHeader
      :exercise="exercise"
      :set-number="setNumber"
      :logged-numbers="loggedNumbers"
      :pain-notice="painNotice"
    />
    <UiStepper v-model="amount" :min="0" :max="REPS_MAX" :unit="unit" />
    <div>
      <p class="vf-label wk-feeling-label">{{ t('feeling.question') }}</p>
      <UiFeeling v-model="feeling" />
    </div>
    <template #action>
      <UiButton variant="primary" size="xl" full-width :disabled="amount <= 0" @click="submit">
        {{ t('workout.logSet', { n: setNumber }) }}
      </UiButton>
      <UiButton v-if="fixing" variant="ghost" full-width @click="emit('cancel')">{{ t('workout.cancelFix') }}</UiButton>
    </template>
  </WorkoutStep>
</template>

<style scoped>
.wk-feeling-label {
  margin-bottom: var(--vf-space-2);
}
</style>
