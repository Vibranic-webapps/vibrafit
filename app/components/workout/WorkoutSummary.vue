<script setup lang="ts">
import type { Summary } from '~/utils/workoutDraft'

/**
 * End-of-workout summary. Facts only: exercises, sets, minutes. No volume,
 * no calories, no body stats. The weekly goal card is not here yet: the
 * weekly goal arrives with Phase 2 (there is no data for it).
 */
const props = defineProps<{
  summary: Summary
  dayKey: string | null
  early: boolean
}>()

defineEmits<{ back: [] }>()

const { t } = useI18n()
const text = useWorkoutText()
const sync = useSyncStatus()

const label = computed(() =>
  props.dayKey
    ? t('workout.summary.label', { name: props.dayKey, min: props.summary.minutes })
    : t('workout.summary.labelNoDay', { min: props.summary.minutes })
)

const queue = useSetQueue()
// "Will sync when you're back online" only when actually offline; online, the
// last sets are uploaded within seconds and the sync badge shows that.
const savedLine = computed(() =>
  sync.hasPending.value && !queue.online.value ? t('workout.summary.savedOffline') : t('workout.summary.saved')
)

const rows = computed(() =>
  props.summary.rows.map((row) => {
    const unit = row.measure === 'seconds' ? ` ${t('workout.secUnit')}` : ''
    const results = row.amounts.length ? `${row.amounts.join(' · ')}${unit}` : undefined
    if (row.outcome === 'skipped') {
      return { slug: row.slug, name: text.name(row), state: 'skipped' as const, stateLabel: t('workout.summary.skipped') }
    }
    if (row.outcome === 'pain') {
      return {
        slug: row.slug,
        name: text.name(row),
        state: 'pain' as const,
        stateLabel: t('workout.summary.pain'),
        detail: row.amounts.length ? t('workout.summary.setsLogged', { n: row.amounts.length }, row.amounts.length) : undefined,
        value: results,
      }
    }
    return { slug: row.slug, name: text.name(row), state: 'done' as const, detail: text.load(row), value: results }
  })
)
</script>

<template>
  <WorkoutStep>
    <header>
      <p class="vf-label">{{ label }}</p>
      <h1 class="vf-display wk-sum__title" tabindex="-1" data-wk-focus>
        {{ early ? t('workout.summary.titleEarly') : t('workout.summary.title') }}
      </h1>
      <p class="vf-muted wk-sum__saved">{{ savedLine }}</p>
    </header>

    <div class="wk-sum__stats">
      <div>
        <p class="vf-num wk-sum__stat">{{ summary.exercisesDone }}<span class="wk-sum__of">/{{ summary.exerciseCount }}</span></p>
        <p class="vf-label">{{ t('workout.summary.exercises') }}</p>
      </div>
      <div>
        <p class="vf-num wk-sum__stat">{{ summary.setCount }}</p>
        <p class="vf-label">{{ t('workout.summary.sets', summary.setCount) }}</p>
      </div>
      <div>
        <p class="vf-num wk-sum__stat">{{ summary.minutes }}</p>
        <p class="vf-label">{{ t('workout.summary.minutes', summary.minutes) }}</p>
      </div>
    </div>

    <UiCard>
      <ul class="wk-sum__list">
        <UiExerciseRow
          v-for="row in rows"
          :key="row.slug"
          :name="row.name"
          :state="row.state"
          :state-label="row.stateLabel"
          :detail="row.detail"
          :value="row.value"
        />
      </ul>
    </UiCard>

    <UiHint v-if="summary.hasPain" :emphasis="t('workout.summary.painNote')" />

    <div class="wk-sum__sync">
      <WorkoutSyncBadge />
      <p v-if="sync.rejectedExplanation.value" class="vf-muted wk-sum__reason">{{ sync.rejectedExplanation.value }}</p>
    </div>

    <template #action>
      <UiButton variant="primary" size="xl" full-width @click="$emit('back')">{{ t('workout.summary.back') }}</UiButton>
    </template>
  </WorkoutStep>
</template>

<style scoped>
.wk-sum__title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-1);
}

.wk-sum__title:focus {
  outline: none;
}

.wk-sum__saved {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.wk-sum__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--vf-space-3);
}

.wk-sum__stat {
  font-size: var(--vf-text-2xl);
  line-height: 1;
}

.wk-sum__of {
  color: var(--vf-color-muted);
  font-size: var(--vf-text-lg);
}

.wk-sum__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wk-sum__sync {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--vf-space-2);
}

.wk-sum__reason {
  font-size: var(--vf-text-sm);
}
</style>
