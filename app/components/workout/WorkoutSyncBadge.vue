<script setup lang="ts">
/**
 * Save status for the whole app, straight from the offline queue. Optionally
 * hidden while everything is saved (Today shows it only when sets wait).
 */
defineProps<{ hideWhenSynced?: boolean }>()

const { state, label } = useSyncStatus()
</script>

<template>
  <UiSyncBadge v-if="!(hideWhenSynced && state === 'synced')" :state="state" :label="label" />
</template>
