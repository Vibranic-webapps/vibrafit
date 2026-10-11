<script setup lang="ts">
/**
 * Square icon-only button (e.g. the "leave workout" X). The accessible name
 * is required, because an icon alone says nothing to a screen reader.
 * Slot takes a lucide icon (aria-hidden is applied here).
 */
defineProps<{
  /** Accessible name, e.g. "Leave workout". Passed in translated. */
  label: string
  type?: 'button' | 'submit'
}>()

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button class="vf-iconbtn" :type="type ?? 'button'" :aria-label="label" @click="$emit('click', $event)">
    <span aria-hidden="true" class="vf-iconbtn__icon"><slot /></span>
  </button>
</template>

<style scoped>
.vf-iconbtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-tap-min);
  height: var(--vf-tap-min);
  padding: 0;
  border-radius: var(--vf-radius);
  border: var(--vf-border) solid var(--vf-color-control-border);
  background: transparent;
  color: var(--vf-color-text);
  cursor: pointer;
  transition: border-color var(--vf-duration-base) var(--vf-ease), background var(--vf-duration-base) var(--vf-ease);
}

.vf-iconbtn__icon {
  display: flex;
}
</style>
