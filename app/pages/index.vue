<script setup lang="ts">
/**
 * Placeholder home. Phase 0 — real "Today" screen lands once the backend
 * has equipment/program data. Kept deliberately minimal: name, tagline,
 * who's signed in, and links to the account page + the living style guide.
 */
const { t } = useI18n()
const user = useAuthUser()

const signedInAs = computed(() => user.value?.name || user.value?.email || '')
</script>

<template>
  <main class="home">
    <p class="vf-label">Vibranic</p>
    <h1 class="vf-display home__title">{{ t('app.name') }}</h1>
    <p class="vf-muted home__tagline">{{ t('app.tagline') }}</p>
    <p v-if="signedInAs" class="home__signed-in">
      {{ t('auth.you.signedInAs', { who: signedInAs }) }}
      <NuxtLink to="/you" class="home__inline-link">{{ t('auth.you.title') }}</NuxtLink>
    </p>
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
  max-width: var(--vf-width-form);
}

.home__signed-in {
  margin-top: var(--vf-space-2);
  font-size: var(--vf-text-sm);
  color: var(--vf-color-muted);
}

.home__inline-link {
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
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
