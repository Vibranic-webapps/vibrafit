<script setup lang="ts">
/**
 * Rest between sets and between exercises. Replaces the logging area in
 * place. The page owns the clock; this only shows it and reports taps.
 * The primary button skips the rest, and once the rest is over becomes
 * "Start set N": the app never starts a set for you.
 */
const props = defineProps<{
  remaining: number
  total: number
  /** "Set 1: 10 reps per side logged." */
  loggedLine: string
  /** Show the "Fix" link (there is a logged set to correct). */
  canFix: boolean
  /** Card heading: "Set 2 of 3" or the next exercise's name. */
  nextTitle: string
  /** Card detail: "One-arm row, aim for ..." */
  nextDetail: string
  /** Primary button label once rest is over. */
  startLabel: string
}>()

defineEmits<{ primary: []; add15: []; fix: [] }>()

const { t } = useI18n()
const text = useWorkoutText()

const over = computed(() => props.remaining <= 0)
</script>

<template>
  <WorkoutStep>
    <section class="wk-rest" aria-labelledby="wk-rest-heading">
      <!-- Focus lands here when rest starts. The visible timer is not a live region. -->
      <h2 id="wk-rest-heading" class="vf-visually-hidden" tabindex="-1" data-wk-focus>{{ t('workout.rest') }}</h2>
      <UiRestTimer
        :remaining="remaining"
        :total="total"
        :label="t('workout.rest')"
        :done-label="t('workout.restOver')"
        :time-label="over ? t('workout.restOver') : text.spokenTime(remaining)"
      />
      <p class="vf-muted wk-rest__logged">
        {{ loggedLine }}
        <button v-if="canFix" type="button" class="wk-rest__fix" @click="$emit('fix')">{{ t('workout.fix') }}</button>
      </p>
    </section>
    <UiCard>
      <p class="vf-label">{{ t('workout.upNext') }}</p>
      <p class="vf-display wk-rest__next">{{ nextTitle }}</p>
      <p class="vf-muted wk-rest__detail">{{ nextDetail }}</p>
    </UiCard>
    <template #action>
      <div class="wk-rest__actions">
        <UiButton variant="secondary" size="xl" @click="$emit('add15')">{{ t('workout.add15') }}</UiButton>
        <UiButton variant="primary" size="xl" @click="$emit('primary')">
          {{ over ? startLabel : t('workout.skipRest') }}
        </UiButton>
      </div>
    </template>
  </WorkoutStep>
</template>

<style scoped>
.wk-rest {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
  padding-top: var(--vf-space-6);
  /* The rest block fades in and rises a little when it replaces the log state. */
  animation: wk-rest-in var(--vf-duration-slow) var(--vf-ease);
}

.wk-rest__logged {
  text-align: center;
  font-size: var(--vf-text-sm);
}

.wk-rest__fix {
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);
  padding: 0 var(--vf-space-2);
  background: none;
  border: 0;
  color: var(--vf-color-accent-text);
  font: inherit;
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
  cursor: pointer;
}

.wk-rest__next {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-lg);
}

.wk-rest__detail {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.wk-rest__actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--vf-space-3);
}

@keyframes wk-rest-in {
  from {
    opacity: 0;
    transform: translateY(var(--vf-space-2));
  }
}
</style>
