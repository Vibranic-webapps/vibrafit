<script setup lang="ts">
/**
 * Confirm "Finish workout now" from Today. Nothing is deleted: the logged
 * sets stay, the workout is simply closed and its summary shown.
 */
defineProps<{ open: boolean; loggedCount: number; busy: boolean }>()
defineEmits<{ close: []; confirm: [] }>()

const { t } = useI18n()
</script>

<template>
  <UiSheet :open="open" :title="t('today.finishSheet.title')" @close="$emit('close')">
    <p class="vf-muted today-sheet-note">{{ t('today.finishSheet.body', { n: loggedCount }, loggedCount) }}</p>
    <UiButton variant="primary" full-width @click="$emit('close')">{{ t('workout.leaveSheet.keep') }}</UiButton>
    <UiButton variant="secondary" full-width :loading="busy" @click="$emit('confirm')">{{ t('workout.leaveSheet.finish') }}</UiButton>
  </UiSheet>
</template>

<style scoped>
.today-sheet-note {
  font-size: var(--vf-text-sm);
}
</style>
