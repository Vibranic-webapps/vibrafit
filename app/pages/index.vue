<script setup lang="ts">
/**
 * Placeholder home. Phase 0 — real "Today" screen lands once the backend
 * has equipment/program data. Kept deliberately minimal: name, tagline,
 * a link to the living style guide.
 */
const { t } = useI18n()
</script>

<template>
  <main class="home">
    <p class="vf-label">Vibranic</p>
    <h1 class="vf-display home__title">{{ t('app.name') }}</h1>
    <p class="vf-muted home__tagline">{{ t('app.tagline') }}</p>
    <NuxtLink to="/design" class="home__link">View the design system &rarr;</NuxtLink>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--vf-space-3);
  padding: var(--vf-space-6);
}

.home__title {
  font-size: var(--vf-text-display);
}

.home__tagline {
  max-width: 320px;
}

.home__link {
  margin-top: var(--vf-space-6);
  min-height: var(--vf-tap-min);
  display: inline-flex;
  align-items: center;
  padding: 0 var(--vf-space-2);
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
  text-decoration: none;
}
</style>
