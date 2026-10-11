<script setup lang="ts">
import { Check, CloudOff, RefreshCw, TriangleAlert } from 'lucide-vue-next'

/**
 * Save/sync status (non-negotiable 6: never lose a set). Always icon + words.
 * Status only, not a button: syncing retries on its own. Sets are saved on
 * the phone first, so the copy reassures instead of alarming.
 *
 * synced   all sets are on the server
 * syncing  sending now
 * waiting  online, but N sets still queued
 * offline  no connection; sets are kept on this phone
 * failed   sending kept failing; still safe on the phone, retrying
 */
export type SyncState = 'synced' | 'syncing' | 'waiting' | 'offline' | 'failed'

defineProps<{
  state: SyncState
  /** Full text, already translated and pluralised, e.g. "3 sets waiting to sync". */
  label: string
}>()
</script>

<template>
  <p class="vf-sync" :class="`vf-sync--${state}`" role="status">
    <Check v-if="state === 'synced'" :size="14" aria-hidden="true" />
    <RefreshCw v-else-if="state === 'syncing'" :size="14" aria-hidden="true" class="vf-sync__spin" />
    <CloudOff v-else-if="state === 'offline'" :size="14" aria-hidden="true" />
    <TriangleAlert v-else-if="state === 'failed'" :size="14" aria-hidden="true" />
    <RefreshCw v-else :size="14" aria-hidden="true" />
    <span>{{ label }}</span>
  </p>
</template>

<style scoped>
.vf-sync {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: var(--vf-space-1);
  min-height: var(--vf-size-sync-chip);
  margin: 0;
  padding: 0 var(--vf-space-2);
  border: var(--vf-border-thin) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius-sm);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
  color: var(--vf-color-muted);
  background: transparent;
}

.vf-sync--synced {
  border-color: transparent;
  color: var(--vf-color-good);
}

.vf-sync--failed {
  border-color: var(--vf-color-hard);
  color: var(--vf-color-hard);
}

.vf-sync__spin {
  animation: vf-sync-spin 1s linear infinite;
}

@keyframes vf-sync-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
