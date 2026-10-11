<script setup lang="ts">
/** Small icon button that removes one row. The label says WHICH row (a11y). */
import { Trash2 } from 'lucide-vue-next'

defineProps<{ label: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="eq-remove" :aria-label="label" @click="$emit('click')">
    <Trash2 :size="20" aria-hidden="true" />
  </button>
</template>

<style scoped>
.eq-remove {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--vf-tap-min);
  height: var(--vf-tap-min);
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-muted);
  cursor: pointer;
}
</style>
