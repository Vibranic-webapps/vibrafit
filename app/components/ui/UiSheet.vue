<script setup lang="ts">
/**
 * Bottom sheet on a native <dialog>: the browser gives us the focus trap,
 * Esc, inert background and focus return for free. Used for the pain/skip
 * choice and "leave workout?". Sheets always contain an explicit "keep
 * going"/cancel button; there is no X.
 *
 * The <dialog> itself is the full-screen scrim (so we don't depend on
 * ::backdrop inheriting tokens); the panel sits at the bottom, thumb zone.
 */
const props = defineProps<{
  open: boolean
  /** Sheet heading (also the dialog's accessible name). */
  title: string
}>()

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

function sync() {
  const el = dialog.value
  if (!el) return
  if (props.open && !el.open) el.showModal()
  else if (!props.open && el.open) el.close()
}

onMounted(sync)
watch(() => props.open, sync)

function onScrimClick(e: MouseEvent) {
  if (e.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog ref="dialog" class="vf-sheet" :aria-labelledby="titleId" @click="onScrimClick" @cancel.prevent="emit('close')">
    <div class="vf-sheet__panel">
      <span class="vf-sheet__handle" aria-hidden="true" />
      <h2 :id="titleId" class="vf-display vf-sheet__title">{{ title }}</h2>
      <div class="vf-sheet__body">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.vf-sheet {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vf-color-text);
}

.vf-sheet[open] {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--vf-color-scrim);
}

.vf-sheet__panel {
  width: 100%;
  max-width: var(--vf-width-page);
  max-height: 90%;
  overflow-y: auto;
  background: var(--vf-color-surface);
  border: var(--vf-border-thin) solid var(--vf-color-border);
  border-bottom: 0;
  border-radius: var(--vf-radius) var(--vf-radius) 0 0;
  padding: var(--vf-space-4) var(--vf-space-4) max(var(--vf-space-4), env(safe-area-inset-bottom));
  animation: vf-sheet-in var(--vf-duration-slow) var(--vf-ease);
}

.vf-sheet__handle {
  display: block;
  width: var(--vf-size-sheet-handle-w);
  height: var(--vf-space-1);
  margin: 0 auto var(--vf-space-4);
  background: var(--vf-color-control-border);
  border-radius: var(--vf-radius-none);
}

.vf-sheet__title {
  font-size: var(--vf-text-xl);
  margin-bottom: var(--vf-space-3);
}

.vf-sheet__body {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
}

@keyframes vf-sheet-in {
  from {
    transform: translateY(var(--vf-space-8));
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
