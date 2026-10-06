<script setup lang="ts">
/**
 * Live rule checklist shown under every new-password field (signup, reset,
 * change password). Rules come straight from shared/utils/password.ts — the
 * same module the server enforces — so this can never promise something the
 * API then refuses.
 */
import { Check, Circle } from 'lucide-vue-next'
import { PASSWORD_RULES } from '~~/shared/utils/password'

const props = defineProps<{ password: string }>()
const { t } = useI18n()

const rows = computed(() => PASSWORD_RULES.map((rule) => ({ id: rule.id, passed: rule.test(props.password) })))
</script>

<template>
  <ul class="pw-checklist" aria-live="polite">
    <li
      v-for="row in rows"
      :key="row.id"
      class="pw-checklist__item"
      :class="{ 'pw-checklist__item--ok': row.passed }"
    >
      <component :is="row.passed ? Check : Circle" :size="16" aria-hidden="true" />
      {{ t(`auth.passwordRules.${row.id}`) }}
    </li>
  </ul>
</template>

<style scoped>
.pw-checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-1);
}

.pw-checklist__item {
  display: flex;
  align-items: center;
  gap: var(--vf-space-2);
  font-size: var(--vf-text-sm);
  color: var(--vf-color-muted);
}

.pw-checklist__item--ok {
  color: var(--vf-color-good);
  font-weight: var(--vf-weight-semibold);
}
</style>
