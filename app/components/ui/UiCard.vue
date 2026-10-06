<script setup lang="ts">
/**
 * Flat surface + hairline border. No shadows — depth comes from the border
 * only, per Chalk & Signal. `hero` is for the one-per-screen featured card
 * (today's workout): same flat surface, marked by a thicker accent edge
 * instead of elevation.
 */
withDefaults(
  defineProps<{
    variant?: 'default' | 'hero'
  }>(),
  {
    variant: 'default',
  }
)
</script>

<template>
  <div class="vf-card" :class="{ 'vf-card--hero': variant === 'hero' }">
    <slot />
  </div>
</template>

<style scoped>
.vf-card {
  background: var(--vf-color-surface);
  border: var(--vf-border-thin) solid var(--vf-color-border);
  border-radius: var(--vf-radius);
  padding: var(--vf-space-5);
}

.vf-card--hero {
  border-color: var(--vf-color-accent);
  border-top-width: var(--vf-border-hero);
}
</style>
