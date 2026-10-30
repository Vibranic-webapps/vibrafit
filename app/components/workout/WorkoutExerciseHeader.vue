<script setup lang="ts">
import type { SetState } from '~/components/ui/UiSetBox.vue'
import type { DraftExercise } from '~/utils/workoutDraft'

/**
 * Top of every "log a set" state: exercise name, per-side hint, the form cue
 * (open on set 1, one tap away after), "Set 2 of 3" with its boxes, and the
 * explainable "Aim for ..." line (non-negotiable 4).
 */
const props = defineProps<{
  exercise: DraftExercise
  setNumber: number
  /** Set numbers already logged for this exercise. */
  loggedNumbers: number[]
  /** Show "Stopped for pain. Your other sets are saved." (the exercise after a pain stop). */
  painNotice?: boolean
}>()

const { t } = useI18n()
const text = useWorkoutText()

// Closed by default: open, it pushed the feeling buttons under the Log set bar
// on a 360x740 phone (QA 2026-10-11). One tap on "Form tip" shows it.
const cueOpen = ref(false)
watch(() => props.exercise.slug, () => (cueOpen.value = false))

const cue = computed(() => text.cue(props.exercise))
const subline = computed(() => {
  if (props.exercise.measure === 'seconds') return t('workout.holdHint')
  if (props.exercise.perSide) return t('workout.perSideHint', { n: text.range(props.exercise) })
  return ''
})
const recipe = computed(() => text.recipe(props.exercise))
const whyLine = computed(() => (props.exercise.measure === 'seconds' ? t('workout.holdWhy') : text.why(props.exercise)))

function boxState(n: number): SetState {
  if (n === props.setNumber) return 'current'
  return props.loggedNumbers.includes(n) ? 'logged' : 'pending'
}
</script>

<template>
  <div class="wk-head">
    <UiHint v-if="painNotice" :emphasis="t('workout.stoppedForPain')" />
    <div>
      <!-- Focus lands here when the step changes, so screen readers start at the exercise. -->
      <h1 class="vf-display wk-head__title" tabindex="-1" data-wk-focus>{{ text.name(exercise) }}</h1>
      <p v-if="subline" class="vf-muted wk-head__sub">{{ subline }}</p>
      <!-- Plain recipe for the dumbbells, so "3.85 kg per hand" is never a puzzle. -->
      <p v-if="recipe" class="wk-head__recipe">{{ recipe }}</p>
      <template v-if="cue">
        <button type="button" class="wk-head__cue-toggle" :aria-expanded="cueOpen" @click="cueOpen = !cueOpen">
          {{ cueOpen ? t('workout.cueHide') : t('workout.cueShow') }}
        </button>
        <p v-if="cueOpen" class="vf-muted wk-head__sub">{{ cue }}</p>
      </template>
    </div>
    <div class="wk-head__sets">
      <span class="vf-label">{{ t('workout.setOf', { n: setNumber, total: exercise.sets }) }}</span>
      <div class="wk-head__boxes">
        <UiSetBox v-for="n in exercise.sets" :key="n" :index="n" :state="boxState(n)" />
      </div>
    </div>
    <UiHint :emphasis="text.aim(exercise)" :context="whyLine || undefined" />
  </div>
</template>

<style scoped>
.wk-head {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk-head__title {
  font-size: var(--vf-text-xl);
}

.wk-head__title:focus {
  outline: none;
}

.wk-head__sub {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.wk-head__recipe {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
}

.wk-head__cue-toggle {
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);
  padding: 0;
  background: none;
  border: 0;
  color: var(--vf-color-accent-text);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
  cursor: pointer;
}

.wk-head__sets {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wk-head__boxes {
  display: flex;
  gap: var(--vf-space-2);
}
</style>
