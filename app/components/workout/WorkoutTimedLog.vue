<script setup lang="ts">
import type { DraftExercise } from '~/utils/workoutDraft'
import type { Feeling } from '~/utils/workoutTypes'

/**
 * "Log a set" for timed exercises (plank). The thumb button walks through
 * three labels in the same place: Start timer -> Stop -> Log set. After Stop
 * the time can be corrected with a stepper. The clock runs from a start
 * timestamp, so a locked screen or a throttled tab can't make it drift.
 */
const props = defineProps<{
  exercise: DraftExercise
  setNumber: number
  loggedNumbers: number[]
  initialAmount: number
  initialFeeling?: Feeling | null
  painNotice?: boolean
  fixing?: boolean
}>()

const emit = defineEmits<{ log: [amount: number, feeling: Feeling | null]; cancel: []; reached: [] }>()

const { t } = useI18n()
const text = useWorkoutText()

type Phase = 'idle' | 'running' | 'stopped'
// Fixing an earlier set skips the timer: only the number needs correcting.
const phase = ref<Phase>(props.fixing ? 'stopped' : 'idle')
const startedAt = ref(0)
const now = ref(Date.now())
const stoppedSeconds = ref(props.fixing ? props.initialAmount : 0)
const feeling = ref<Feeling | null>(props.initialFeeling ?? null)
let ticker: ReturnType<typeof setInterval> | undefined
let reachedSent = false

const seconds = computed(() => (phase.value === 'running' ? Math.max(0, Math.floor((now.value - startedAt.value) / 1000)) : 0))
const reached = computed(() => seconds.value >= props.exercise.targetMin)

const status = computed(() => {
  if (phase.value === 'idle') return t('workout.timerReady')
  return reached.value ? t('workout.timerReached') : t('workout.timerHold')
})

watch(reached, (isReached) => {
  if (isReached && phase.value === 'running' && !reachedSent) {
    reachedSent = true
    emit('reached')
  }
})

function startTimer() {
  startedAt.value = Date.now()
  now.value = startedAt.value
  reachedSent = false
  phase.value = 'running'
  ticker = setInterval(() => (now.value = Date.now()), 250)
}

function stopTimer() {
  now.value = Date.now()
  stoppedSeconds.value = Math.max(0, Math.floor((now.value - startedAt.value) / 1000))
  clearInterval(ticker)
  phase.value = 'stopped'
}

function redo() {
  clearInterval(ticker)
  stoppedSeconds.value = 0
  feeling.value = null
  phase.value = 'idle'
}

function submit() {
  if (stoppedSeconds.value <= 0) return
  emit('log', stoppedSeconds.value, feeling.value)
}

onBeforeUnmount(() => clearInterval(ticker))
</script>

<template>
  <WorkoutStep>
    <WorkoutExerciseHeader
      :exercise="exercise"
      :set-number="setNumber"
      :logged-numbers="loggedNumbers"
      :pain-notice="painNotice"
    />
    <UiHoldTimer
      v-if="phase !== 'stopped'"
      :seconds="seconds"
      :running="phase === 'running'"
      :target="exercise.targetMin"
      :status-label="status"
      :time-label="text.spokenTime(seconds)"
    />
    <template v-else>
      <UiStepper v-model="stoppedSeconds" :min="0" :max="HOLD_MAX_SECONDS" :step="HOLD_STEP_SECONDS" :unit="t('workout.secUnit')" />
      <div>
        <p class="vf-label wk-feeling-label">{{ t('feeling.question') }}</p>
        <UiFeeling v-model="feeling" />
      </div>
      <UiButton v-if="!fixing" variant="ghost" full-width @click="redo">{{ t('workout.redo') }}</UiButton>
    </template>
    <template #action>
      <UiButton v-if="phase === 'idle'" variant="secondary" size="xl" full-width @click="startTimer">
        {{ t('workout.startTimer') }}
      </UiButton>
      <UiButton v-else-if="phase === 'running'" variant="danger" size="xl" full-width @click="stopTimer">
        {{ t('workout.stop') }}
      </UiButton>
      <UiButton v-else variant="primary" size="xl" full-width :disabled="stoppedSeconds <= 0" @click="submit">
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
