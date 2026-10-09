<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'

/**
 * One set in a set-dots row. `index` is the set number shown inside the box
 * until it's logged, when it snaps to a green check (the "stamp" per the
 * SHRED inspiration note). Skipped sets show an X so meaning never depends
 * on colour alone.
 */
export type SetState = 'pending' | 'current' | 'logged' | 'skipped'

const props = defineProps<{
  index: number
  state: SetState
  /** e.g. "9 reps × 4 kg" — read out for screen readers, not shown visually (the dot is too small). */
  target?: string
}>()

const { t } = useI18n()

function statusWord(state: SetState) {
  if (state === 'pending') return t('ui.set.pending')
  if (state === 'current') return t('ui.set.current')
  if (state === 'logged') return t('ui.set.logged')
  return t('ui.set.skipped')
}

const srText = computed(() => {
  const base = `Set ${props.index}, ${statusWord(props.state)}`
  return props.target ? `${base}, target ${props.target}` : base
})
</script>

<template>
  <div class="vf-setbox" :class="`vf-setbox--${state}`">
    <Check v-if="state === 'logged'" :size="16" aria-hidden="true" class="vf-setbox__stamp" />
    <X v-else-if="state === 'skipped'" :size="14" aria-hidden="true" />
    <span v-else class="vf-num vf-setbox__index">{{ index }}</span>
    <span class="vf-visually-hidden">{{ srText }}</span>
  </div>
</template>

<style scoped>
.vf-setbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-size-dot-sm);
  height: var(--vf-size-dot-sm);
  min-width: var(--vf-size-dot-sm);
  border-radius: var(--vf-radius-sm);
  border: var(--vf-border-thick) solid var(--vf-color-control-border);
  color: var(--vf-color-muted);
  background: transparent;
  box-sizing: border-box;
}

.vf-setbox__index {
  font-size: var(--vf-text-sm);
}

.vf-setbox--current {
  border-color: var(--vf-color-text);
  color: var(--vf-color-text);
}

.vf-setbox--logged {
  background: var(--vf-color-good);
  border-color: var(--vf-color-good);
  color: var(--vf-color-on-good);
  animation: vf-stamp var(--vf-duration-slow) var(--vf-ease-stamp);
}

.vf-setbox--skipped {
  border-style: dashed;
  color: var(--vf-color-muted);
  opacity: 0.7;
}

@keyframes vf-stamp {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}
</style>
