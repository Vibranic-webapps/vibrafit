<script setup lang="ts">
/**
 * Frame for every signed-out screen (login, signup, forgot/reset password):
 * the VIBRAFIT wordmark over one flat, hairline-bordered card. No shadows,
 * no neumorphism — Chalk & Signal is flat everywhere, including here.
 *
 * Styles the shared classes a page puts inside the slots (.auth-form,
 * .auth-link, .auth-alert, .auth-footer-text) via :slotted — centralised
 * once here instead of copy-pasted into every auth page.
 */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <main class="auth-shell">
    <p class="vf-label auth-shell__brand">Vibranic</p>
    <p class="vf-display auth-shell__wordmark">VIBRAFIT</p>

    <UiCard class="auth-shell__card">
      <h1 class="vf-display auth-shell__title">{{ title }}</h1>
      <p v-if="subtitle" class="vf-muted auth-shell__subtitle">{{ subtitle }}</p>
      <slot />
    </UiCard>

    <div v-if="$slots.footer" class="auth-shell__footer">
      <slot name="footer" />
    </div>
  </main>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--vf-space-4);
  padding: var(--vf-space-6) var(--vf-space-4);
}

.auth-shell__brand {
  margin: 0;
}

.auth-shell__wordmark {
  margin: 0 0 var(--vf-space-2);
  font-size: var(--vf-text-2xl);
  color: var(--vf-color-accent-text);
}

.auth-shell__card {
  width: 100%;
  max-width: var(--vf-width-form);
}

.auth-shell__title {
  font-size: var(--vf-text-xl);
}

.auth-shell__subtitle {
  margin-top: var(--vf-space-1);
  margin-bottom: var(--vf-space-4);
}

.auth-shell__footer {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  width: 100%;
  max-width: var(--vf-width-form);
}

/* --- shared classes used by the slot content pages pass in --------------- */
:slotted(.auth-form) {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

:slotted(.auth-link) {
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
}

:slotted(.auth-footer-text) {
  margin: 0;
  font-size: var(--vf-text-sm);
  text-align: center;
  color: var(--vf-color-muted);
}

:slotted(.auth-alert) {
  margin: 0;
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  font-size: var(--vf-text-sm);
}

:slotted(.auth-alert--error) {
  border: var(--vf-border) solid var(--vf-color-hard);
  background: var(--vf-color-surface);
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}

:slotted(.auth-alert--notice) {
  background: var(--vf-color-chip-bg);
  color: var(--vf-color-text);
}
</style>
