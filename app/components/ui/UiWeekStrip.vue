<script setup lang="ts">
import { Check, Minus, X } from 'lucide-vue-next'

/**
 * Mon–Sun strip. Purely presentational — the parent resolves real dates
 * (Europe/Brussels, Monday-first per project rules) into this array.
 * Each day's state is shown by shape + icon, never colour alone, so it
 * still reads correctly for colour-blind users or without the aria text.
 */
export type DayState = 'done' | 'planned' | 'missed' | 'rest'

export interface WeekDay {
  /** Short label shown in the strip, e.g. "Mon". Supplied by the parent so this stays i18n-free. */
  label: string
  state: DayState
  today?: boolean
}

defineProps<{ days: WeekDay[] }>()

const { t } = useI18n()

function statusWord(state: DayState) {
  return t(`ui.weekStrip.${state}`)
}
</script>

<template>
  <ol class="vf-weekstrip">
    <li v-for="(day, i) in days" :key="i" class="vf-weekstrip__day">
      <span class="vf-weekstrip__label vf-label">{{ day.label }}</span>
      <span
        class="vf-weekstrip__dot"
        :class="`vf-weekstrip__dot--${day.state}`"
        :data-today="day.today ? 'true' : undefined"
      >
        <Check v-if="day.state === 'done'" :size="16" aria-hidden="true" />
        <X v-else-if="day.state === 'missed'" :size="14" aria-hidden="true" />
        <Minus v-else-if="day.state === 'rest'" :size="14" aria-hidden="true" />
      </span>
      <span class="vf-visually-hidden">
        {{ day.label }}, {{ statusWord(day.state) }}<template v-if="day.today">, {{ t('ui.weekStrip.today') }}</template>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.vf-weekstrip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--vf-space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.vf-weekstrip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vf-space-2);
}

.vf-weekstrip__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-size-dot-md);
  height: var(--vf-size-dot-md);
  min-width: var(--vf-size-dot-md);
  min-height: var(--vf-size-dot-md);
  border-radius: 50%;
  border: var(--vf-border) solid var(--vf-color-control-border);
  color: var(--vf-color-muted);
  background: transparent;
  box-sizing: border-box;
}

.vf-weekstrip__dot[data-today='true'] {
  outline: var(--vf-border-thick) solid var(--vf-color-accent);
  outline-offset: var(--vf-space-half);
}

.vf-weekstrip__dot--done {
  background: var(--vf-color-good);
  border-color: var(--vf-color-good);
  color: var(--vf-color-on-good);
}

.vf-weekstrip__dot--missed {
  border-color: var(--vf-color-hard);
  color: var(--vf-color-hard);
}

.vf-weekstrip__dot--rest {
  background: var(--vf-color-chip-bg);
  border-color: var(--vf-color-chip-bg);
  color: var(--vf-color-muted);
}
</style>
