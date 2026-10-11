<script setup lang="ts">
/**
 * "Pain or skipping?" (non-negotiable 8: pain = stop, on every exercise; this
 * is not medical advice). The safe exit, "Back to workout", is last = closest
 * to the thumb. Pain only skips the rest of ONE exercise; nothing is lost, so
 * there is no extra confirm.
 */
defineProps<{ open: boolean; exerciseName: string }>()
defineEmits<{ close: []; skip: []; pain: [] }>()

const { t } = useI18n()
</script>

<template>
  <UiSheet :open="open" :title="t('workout.painSheet.title')" @close="$emit('close')">
    <p v-if="exerciseName" class="vf-muted wk-sheet-note">{{ t('workout.painSheet.for', { name: exerciseName }) }}</p>
    <UiButton variant="secondary" full-width @click="$emit('skip')">{{ t('workout.painSheet.skip') }}</UiButton>
    <UiButton variant="danger" full-width @click="$emit('pain')">{{ t('workout.painSheet.pain') }}</UiButton>
    <p class="vf-muted wk-sheet-note">{{ t('workout.painSheet.note') }}</p>
    <UiButton variant="ghost" full-width @click="$emit('close')">{{ t('workout.painSheet.back') }}</UiButton>
  </UiSheet>
</template>

<style scoped>
.wk-sheet-note {
  font-size: var(--vf-text-sm);
}
</style>
