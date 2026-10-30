<script setup lang="ts">
/**
 * Workout mode (/workout/<session clientId>, no tab bar). The id is the
 * session's client-generated id, so the page works for a workout that only
 * exists on this phone (offline). All the behaviour lives in useWorkoutRun;
 * this page decides which state to draw.
 */
const route = useRoute()
const { t } = useI18n()
const text = useWorkoutText()
const queue = useSetQueue()

const clientId = String(route.params.id)
const {
  status,
  draft,
  view,
  exercise,
  setNumber,
  loggedNumbers,
  initialAmount,
  fixing,
  segments,
  exerciseNumber,
  loggedCount,
  summary,
  showPainNotice,
  sheetExercise,
  rest,
  restRemaining,
  announcement,
  leaveOpen,
  painOpen,
  lastLogged,
  position,
  load,
  logSet,
  restPrimary,
  addRestTime,
  autoContinue,
  startFix,
  cancelFix,
  skipExercise,
  stopForPain,
  finishNow,
  goToday,
  announce,
} = useWorkoutRun(clientId)

useHead({ title: computed(() => t('workout.pageTitle')) })
onMounted(load)

const title = computed(() =>
  draft.value?.dayKey ? t('today.workoutName', { name: draft.value.dayKey }) : t('today.workoutNameless')
)
const totalExercises = computed(() => draft.value?.exercises.length ?? 0)
const doneExercises = computed(() => segments.value.filter((s) => s === 'done').length)
const progressLabel = computed(() =>
  t('workout.progressLabel', { n: exerciseNumber.value, total: totalExercises.value, done: doneExercises.value })
)
const exerciseLabel = computed(() => t('workout.exerciseOf', { n: exerciseNumber.value, total: totalExercises.value }))

/** New log step = fresh stepper and feeling (the component remounts). */
const logKey = computed(() => `${exercise.value?.slug}-${setNumber.value}-${fixing.value?.clientId ?? 'new'}`)

/** The set a Fix would correct, as the muted line under the timer. */
const restInfo = computed(() => {
  const d = draft.value
  const last = lastLogged.value
  const next = exercise.value
  if (!d || !next) return null

  const lastExercise = last ? d.exercises.find((e) => e.slug === last.exerciseSlug) : null
  let loggedLine = ''
  if (last && lastExercise) {
    const key = lastExercise.measure === 'seconds'
      ? 'workout.loggedLineSeconds'
      : lastExercise.perSide ? 'workout.loggedLinePerSide' : 'workout.loggedLine'
    loggedLine = t(key, { n: last.setNumber, reps: last.amount ?? 0 })
  }

  const sameExercise = !!last && last.exerciseSlug === next.slug
  const setLine = t('workout.setOf', { n: setNumber.value, total: next.sets })
  return {
    loggedLine,
    canFix: !!last,
    nextTitle: sameExercise ? setLine : text.name(next),
    nextDetail: sameExercise ? `${text.name(next)} · ${text.aim(next)}` : `${setLine} · ${text.aim(next)}`,
    startLabel: sameExercise ? t('workout.startSet', { n: setNumber.value }) : t('workout.startNextExercise'),
  }
})

function leaveAndResumeLater() {
  leaveOpen.value = false
  void goToday()
}

function finishFromSheet() {
  leaveOpen.value = false
  finishNow()
}

function skipFromSheet() {
  painOpen.value = false
  skipExercise()
}

function painFromSheet() {
  painOpen.value = false
  stopForPain()
}
</script>

<template>
  <main class="wk">
    <!-- The one live region. Only milestones are announced here; the ticking numbers never are. -->
    <p class="vf-visually-hidden" role="status" aria-live="polite">{{ announcement }}</p>

    <!-- Loading: top bar and blocks, button area reserved so nothing jumps. -->
    <div v-if="status === 'loading'" class="wk__skeleton" role="status" :aria-label="t('ui.loading')">
      <div v-for="n in 4" :key="n" class="wk__skeleton-block" aria-hidden="true" />
    </div>

    <UiCard v-else-if="status === 'notFound'">
      <div class="wk__message">
        <p>{{ t('workout.notFound') }}</p>
        <UiButton variant="primary" size="xl" full-width @click="goToday">{{ t('workout.summary.back') }}</UiButton>
      </div>
    </UiCard>

    <UiCard v-else-if="status === 'error'">
      <div class="wk__message">
        <p role="alert">{{ t('workout.loadError') }}</p>
        <UiButton variant="secondary" full-width @click="load">{{ t('today.tryAgain') }}</UiButton>
        <UiButton variant="ghost" full-width @click="goToday">{{ t('workout.summary.back') }}</UiButton>
      </div>
    </UiCard>

    <template v-else-if="draft">
      <WorkoutTopBlock
        v-if="view !== 'summary'"
        :title="title"
        :segments="segments"
        :progress-label="progressLabel"
        :exercise-label="exerciseLabel"
        @leave="leaveOpen = true"
        @pain="painOpen = true"
      />

      <p v-if="!queue.storageOk.value" class="wk__alert" role="alert">{{ t('sync.storageFailed') }}</p>

      <template v-if="view === 'log' && exercise">
        <WorkoutTimedLog
          v-if="exercise.measure === 'seconds'"
          :key="logKey"
          :exercise="exercise"
          :set-number="setNumber"
          :logged-numbers="loggedNumbers"
          :initial-amount="initialAmount"
          :initial-feeling="fixing?.feeling"
          :pain-notice="showPainNotice"
          :fixing="!!fixing"
          @log="logSet"
          @cancel="cancelFix"
          @reached="announce(t('workout.timerReached'))"
        />
        <WorkoutRepsLog
          v-else
          :key="logKey"
          :exercise="exercise"
          :set-number="setNumber"
          :logged-numbers="loggedNumbers"
          :initial-amount="initialAmount"
          :initial-feeling="fixing?.feeling"
          :pain-notice="showPainNotice"
          :fixing="!!fixing"
          @log="logSet"
          @cancel="cancelFix"
        />
      </template>

      <WorkoutRest
        v-else-if="view === 'rest' && rest && restInfo"
        :remaining="restRemaining"
        :total="rest.total"
        :logged-line="restInfo.loggedLine"
        :can-fix="restInfo.canFix"
        :next-title="restInfo.nextTitle"
        :next-detail="restInfo.nextDetail"
        :start-label="restInfo.startLabel"
        @primary="restPrimary"
        :auto-continue="autoContinue.enabled.value"
        @toggle-auto="autoContinue.toggle"
        @add15="addRestTime"
        @fix="startFix"
      />

      <WorkoutSummary
        v-else-if="view === 'summary' && summary"
        :summary="summary"
        :day-key="draft.dayKey"
        :early="draft.finishedEarly"
        @back="goToday"
      />

      <WorkoutPainSheet
        :open="painOpen"
        :exercise-name="sheetExercise ? text.name(sheetExercise) : ''"
        @close="painOpen = false"
        @skip="skipFromSheet"
        @pain="painFromSheet"
      />
      <WorkoutLeaveSheet
        :open="leaveOpen"
        :logged-count="loggedCount"
        @close="leaveOpen = false"
        @leave="leaveAndResumeLater"
        @finish="finishFromSheet"
      />
    </template>
  </main>
</template>

<style scoped>
.wk {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
  min-height: 100dvh;
  max-width: var(--vf-width-page);
  margin: 0 auto;
  padding: var(--vf-space-4) var(--vf-space-4) 0;
}

.wk__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk__skeleton-block {
  height: calc(var(--vf-space-16) * 2);
  border-radius: var(--vf-radius);
  background: var(--vf-color-chip-bg);
}

.wk__message {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk__alert {
  padding: var(--vf-space-3);
  border: var(--vf-border) solid var(--vf-color-hard);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-hard);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
}
</style>
