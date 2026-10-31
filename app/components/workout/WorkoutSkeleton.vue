<script setup lang="ts">
/**
 * Workout mode while the draft loads: progress segments, the exercise
 * heading with its set boxes, the big input, and the thumb button pinned to
 * the bottom, so the layout is already where it will be.
 */
const { t } = useI18n()
</script>

<template>
  <div class="wk-sk" role="status" :aria-label="t('ui.loading')">
    <div class="wk-sk__top" aria-hidden="true">
      <div class="wk-sk__segments">
        <UiSkeleton v-for="n in 6" :key="n" height="var(--vf-space-2)" :index="n" />
      </div>
      <div class="wk-sk__line wk-sk__line--title"><UiSkeleton width="64%" height="26px" :index="1" /></div>
      <div class="wk-sk__line wk-sk__line--meta"><UiSkeleton width="40%" height="12px" :index="2" /></div>
      <div class="wk-sk__sets">
        <UiSkeleton v-for="n in 3" :key="n" shape="chip" width="var(--vf-size-dot-sm)" height="var(--vf-size-dot-sm)" :index="n + 2" />
      </div>
    </div>
    <UiSkeleton shape="block" height="calc(var(--vf-space-16) * 2)" :index="6" aria-hidden="true" />
    <UiSkeleton class="wk-sk__go" shape="block" height="var(--vf-size-button-xl)" :index="7" aria-hidden="true" />
  </div>
</template>

<style scoped>
.wk-sk {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.wk-sk__top {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
}

.wk-sk__segments {
  display: flex;
  gap: var(--vf-space-1);
}

.wk-sk__segments > * {
  flex: 1;
}

.wk-sk__line {
  display: flex;
  align-items: center;
}

.wk-sk__line--title {
  height: calc(var(--vf-text-xl) * var(--vf-leading-tight));
  margin-top: var(--vf-space-3);
}

.wk-sk__line--meta {
  height: calc(var(--vf-text-sm) * var(--vf-leading-normal));
}

.wk-sk__sets {
  display: flex;
  gap: var(--vf-space-2);
}

.wk-sk__go {
  margin-top: auto;
  margin-bottom: var(--vf-space-4);
}
</style>
