<script setup lang="ts">
/**
 * The "why" line under a target (non-negotiable 4: every suggestion is
 * explainable). Optional muted context first ("Last time 8 / 8 / 8."),
 * then the bold accent instruction ("Aim for 9 today."). Text is passed in
 * already translated; this component only styles it.
 */
defineProps<{
  /** Muted first line, e.g. "Last time 8 / 8 / 8." Omit when there is no history yet. */
  context?: string
  /** The instruction, e.g. "Aim for 10–12 at 7.85 kg." */
  emphasis: string
}>()
</script>

<template>
  <p class="vf-hint">
    <span v-if="context" class="vf-muted">{{ context }}</span>
    <strong class="vf-hint__emphasis">{{ emphasis }}</strong>
  </p>
</template>

<style scoped>
.vf-hint {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-half);
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  background: var(--vf-color-hint-bg);
  font-size: var(--vf-text-base);
}

.vf-hint__emphasis {
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
}
</style>
