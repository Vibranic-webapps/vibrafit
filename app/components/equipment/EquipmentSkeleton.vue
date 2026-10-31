<script setup lang="ts">
/**
 * Equipment while the saved setup loads: the same stack of cards as the real
 * form (section label, hint, two inputs, add button). The real rows depend on
 * what was saved, so only the card chrome is exact; the inputs use the tap size.
 */
const { t } = useI18n()
</script>

<template>
  <div class="eq-sk" role="status" :aria-label="t('equipment.loading')">
    <UiCard v-for="n in 3" :key="n">
      <div aria-hidden="true">
        <div class="eq-sk__line eq-sk__line--label"><UiSkeleton width="40%" height="10px" :index="n" /></div>
        <div class="eq-sk__line eq-sk__line--hint"><UiSkeleton width="78%" height="12px" :index="n + 1" /></div>
        <div class="eq-sk__grid">
          <UiSkeleton shape="block" height="var(--vf-size-button-xl)" :index="n + 2" />
          <UiSkeleton shape="block" height="var(--vf-size-button-xl)" :index="n + 3" />
        </div>
        <UiSkeleton shape="block" height="var(--vf-tap-min)" :index="n + 4" />
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.eq-sk {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.eq-sk__line {
  display: flex;
  align-items: center;
}

.eq-sk__line--label {
  height: calc(var(--vf-text-xs) * var(--vf-leading-normal));
  margin-bottom: var(--vf-space-1);
}

.eq-sk__line--hint {
  height: calc(var(--vf-text-sm) * var(--vf-leading-normal));
  margin-bottom: var(--vf-space-4);
}

.eq-sk__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--vf-space-3);
  margin-bottom: var(--vf-space-4);
}
</style>
