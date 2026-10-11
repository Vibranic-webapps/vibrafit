<script setup lang="ts">
/**
 * "Loads you can build": every weight the load calculator says the entered
 * gear can make, split into pairs (two dumbbells) and singles (one), each with
 * how to build it. Recomputes live as the form changes.
 */
import { buildableLoads, type Equipment, type LoadOption } from '~~/shared/utils/loads'

const props = defineProps<{
  /** Equipment in integer grams. Only complete, valid rows are included. */
  equipment: Equipment
  /** True when some form rows are incomplete and therefore left out. */
  hasSkippedRows: boolean
}>()

const { t } = useI18n()

// buildableLoads throws RangeError on bad input; show a message instead of crashing the page.
const result = computed<{ options: LoadOption[]; failed: boolean }>(() => {
  try {
    // A 0 kg "load" (empty unweighed handle) isn't something to train with, so leave it out.
    return { options: buildableLoads(props.equipment).filter((o) => o.grams > 0), failed: false }
  } catch {
    return { options: [], failed: true }
  }
})

const pairs = computed(() => result.value.options.filter((o) => o.mode === 'pair'))
const singles = computed(() => result.value.options.filter((o) => o.mode === 'single'))

const handlesUnweighed = computed(() => props.equipment.handles.count > 0 && props.equipment.handles.grams === 0)

function kg(grams: number): string {
  return gramsToKg(grams)
}

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
  <section class="eq-loads" aria-labelledby="eq-loads-title" aria-live="polite">
    <h2 id="eq-loads-title" class="vf-label eq-loads__title">{{ t('equipment.loads.title') }}</h2>

    <p v-if="result.failed" class="eq-loads__note" role="alert">{{ t('equipment.loads.error') }}</p>

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
  </section>
</template>

<style scoped>
.eq-loads {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  padding: var(--vf-space-5);
  background: var(--vf-color-surface);
  border: var(--vf-border-thin) solid var(--vf-color-accent);
  border-top-width: var(--vf-border-hero);
  border-radius: var(--vf-radius);
}

.eq-loads__title {
  margin: 0;
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
