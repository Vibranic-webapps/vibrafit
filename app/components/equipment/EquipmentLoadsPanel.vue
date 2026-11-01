<script setup lang="ts">
/**
 * "Loads you can build", at the top of the equipment screen. Closed it is one
 * line (how many loads, lightest to heaviest); open it lists every load the
 * gear can make, split into pairs (two dumbbells) and singles (one), each with
 * how to build it. The page computes the loads once and hands them in, so the
 * same numbers also drive the live count in the save bar.
 */
import { ChevronDown } from 'lucide-vue-next'
import type { LoadOption } from '~~/shared/utils/loads'
import type { LoadsSummary } from '~~/shared/utils/loadsSummary'

const props = defineProps<{
  /** Loads the current gear can build (0 kg leftovers already removed). */
  options: LoadOption[]
  summary: LoadsSummary
  /** True when the load calculation threw; shows a message instead of a list. */
  failed: boolean
  /** Handles are entered but not weighed: loads leave out the handle weight. */
  handlesUnweighed: boolean
  /** True when some form rows are incomplete and therefore left out. */
  hasSkippedRows: boolean
}>()

const { t } = useI18n()

const pairs = computed(() => props.options.filter((o) => o.mode === 'pair'))
const singles = computed(() => props.options.filter((o) => o.mode === 'single'))

function kg(grams: number): string {
  return gramsToKg(grams)
}

const headline = computed(() => {
  if (props.failed) return t('equipment.loads.errorShort')
  if (!props.summary.count) return t('equipment.loads.none')
  return t('equipment.loads.headline', { n: props.summary.count }, props.summary.count)
})

const range = computed(() => {
  const { minGrams, maxGrams } = props.summary
  if (props.failed || minGrams === null || maxGrams === null) return ''
  if (minGrams === maxGrams) return t('equipment.loads.kg', { kg: kg(minGrams) })
  return t('equipment.loads.range', { min: kg(minGrams), max: kg(maxGrams) })
})

function side(plates: number[]): string {
  return plates.length ? plates.map((g) => kg(g)).join(' + ') : ''
}

/** "2 + 1 kg per side", "handle only", or "fixed weight ball". */
function buildText(option: LoadOption): string {
  if (option.kind === 'fixed') return option.label ?? ''
  const [first, second] = option.dumbbells
  if (!first) return ''
  const a = side(first)
  if (!second) return a ? t('equipment.loads.perSide', { plates: a }) : t('equipment.loads.handleOnly')
  const b = side(second)
  // Same plates on both dumbbells: one line. Otherwise say what goes on each.
  if (a === b) return a ? t('equipment.loads.perSideEach', { plates: a }) : t('equipment.loads.handleOnly')
  return t('equipment.loads.perSideSplit', {
    first: a || t('equipment.loads.noPlates'),
    second: b || t('equipment.loads.noPlates'),
  })
}

function key(option: LoadOption, index: number): string {
  return `${option.mode}-${option.kind}-${option.label ?? ''}-${option.grams}-${index}`
}
</script>

<template>
  <details class="eq-loads">
    <summary class="eq-loads__summary">
      <span class="eq-loads__head">
        <span class="vf-label eq-loads__title">{{ t('equipment.loads.title') }}</span>
        <span class="eq-loads__headline vf-display" :class="{ 'eq-loads__headline--none': failed || !summary.count }">{{ headline }}</span>
        <span v-if="range" class="eq-loads__range vf-num">{{ range }}</span>
      </span>
      <span class="eq-loads__toggle" aria-hidden="true">
        <ChevronDown :size="22" class="eq-loads__chevron" />
      </span>
      <span class="eq-loads__action vf-muted">{{ t('equipment.loads.toggle') }}</span>
    </summary>

    <div class="eq-loads__body">
      <p v-if="failed" class="eq-loads__note" role="alert">{{ t('equipment.loads.error') }}</p>

      <template v-else>
        <p v-if="handlesUnweighed" class="eq-loads__note">{{ t('equipment.loads.handlesUnweighed') }}</p>
        <p v-if="hasSkippedRows" class="eq-loads__note">{{ t('equipment.loads.skippedRows') }}</p>

        <p v-if="!pairs.length && !singles.length" class="vf-muted eq-loads__empty">{{ t('equipment.loads.empty') }}</p>

        <div v-for="group in [
          { id: 'pairs', heading: t('equipment.loads.pairs'), hint: t('equipment.loads.pairsHint'), options: pairs },
          { id: 'singles', heading: t('equipment.loads.singles'), hint: t('equipment.loads.singlesHint'), options: singles },
        ]" :key="group.id">
          <template v-if="group.options.length">
            <h3 class="eq-loads__group">{{ group.heading }}</h3>
            <p class="vf-muted eq-loads__hint">{{ group.hint }}</p>
            <ul class="eq-loads__list">
              <li v-for="(option, i) in group.options" :key="key(option, i)" class="eq-loads__item">
                <span class="eq-loads__weight vf-num">{{ t('equipment.loads.kg', { kg: kg(option.grams) }) }}</span>
                <span class="eq-loads__build vf-muted">{{ buildText(option) }}</span>
              </li>
            </ul>
          </template>
        </div>
      </template>
    </div>
  </details>
</template>

<style scoped>
.eq-loads {
  background: var(--vf-color-surface);
  border: var(--vf-border-thin) solid var(--vf-color-accent);
  border-top-width: var(--vf-border-hero);
  border-radius: var(--vf-radius);
}

/* The whole summary is the tap target. */
.eq-loads__summary {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--vf-space-1) var(--vf-space-3);
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-4) var(--vf-space-5);
  cursor: pointer;
  list-style: none;
}

.eq-loads__summary::-webkit-details-marker {
  display: none;
}

.eq-loads__head {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-1);
  min-width: 0;
}

.eq-loads__title {
  margin: 0;
}

.eq-loads__headline {
  font-size: var(--vf-text-xl);
}

.eq-loads__headline--none {
  font-size: var(--vf-text-lg);
}

.eq-loads__range {
  font-size: var(--vf-text-lg);
  color: var(--vf-color-accent-text);
}

.eq-loads__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-tap-min);
  height: var(--vf-tap-min);
  color: var(--vf-color-accent-text);
}

.eq-loads__chevron {
  transition: transform var(--vf-duration-base) var(--vf-ease);
}

.eq-loads[open] .eq-loads__chevron {
  transform: rotate(180deg);
}

.eq-loads__action {
  grid-column: 1 / -1;
  font-size: var(--vf-text-sm);
}

.eq-loads__body {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  padding: var(--vf-space-4) var(--vf-space-5) var(--vf-space-5);
  border-top: var(--vf-border-thin) solid var(--vf-color-border);
}

.eq-loads__note {
  margin: 0;
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  background: var(--vf-color-hint-bg);
  font-size: var(--vf-text-sm);
}

.eq-loads__empty {
  margin: 0;
}

.eq-loads__group {
  margin: var(--vf-space-3) 0 0;
  font-family: var(--vf-font-display);
  font-weight: var(--vf-weight-display);
  font-size: var(--vf-text-lg);
  text-transform: var(--vf-display-case);
}

.eq-loads__hint {
  margin: 0;
  font-size: var(--vf-text-sm);
}

.eq-loads__list {
  list-style: none;
  margin: var(--vf-space-2) 0 0;
  padding: 0;
}

.eq-loads__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--vf-space-3);
  padding: var(--vf-space-2) 0;
  border-top: var(--vf-border-thin) solid var(--vf-color-border);
}

.eq-loads__weight {
  flex: none;
  font-size: var(--vf-text-xl);
}

.eq-loads__build {
  text-align: right;
  font-size: var(--vf-text-sm);
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
