<script setup lang="ts">
/**
 * "Leave this workout?" Opened by the X and by the back gesture. Leaving
 * deletes nothing: the sets are already on the phone and Today offers Resume.
 */
defineProps<{ open: boolean; loggedCount: number }>()
defineEmits<{ close: []; leave: []; finish: [] }>()

const { t } = useI18n()
</script>

<template>
  <UiSheet :open="open" :title="t('workout.leaveSheet.title')" @close="$emit('close')">
    <p class="vf-muted wk-sheet-note">{{ t('workout.leaveSheet.body', { n: loggedCount }, loggedCount) }}</p>
    <UiButton variant="primary" full-width @click="$emit('close')">{{ t('workout.leaveSheet.keep') }}</UiButton>
    <UiButton variant="secondary" full-width @click="$emit('leave')">{{ t('workout.leaveSheet.leave') }}</UiButton>
    <UiButton variant="ghost" full-width @click="$emit('finish')">{{ t('workout.leaveSheet.finish') }}</UiButton>
  </UiSheet>
</template>

<style scoped>
.wk-sheet-note {
  font-size: var(--vf-text-sm);
}
</style>
