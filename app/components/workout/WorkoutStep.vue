<script setup lang="ts">
/**
 * Layout shared by every workout state: content on top, and the one thumb
 * button pinned to the bottom (sticky, so it never scrolls out of reach on a
 * short screen). Same spot every time = muscle memory.
 */
</script>

<template>
  <div class="wk-step">
    <div class="wk-step__body">
      <slot />
    </div>
    <div v-if="$slots.action" class="wk-step__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.wk-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk-step__body {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk-step__action {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  z-index: var(--vf-z-tabbar);
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
  padding-top: var(--vf-space-3);
  padding-bottom: max(var(--vf-space-4), env(safe-area-inset-bottom));
  background: var(--vf-color-bg);
}
</style>
