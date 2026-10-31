<script setup lang="ts">
/**
 * Today while the plan loads: the same stack as TodayReady (hero card with
 * Start, the 10-minute option, the "In this workout" list), built from
 * UiSkeleton shapes. Every wrapper takes the line-height of the text it
 * replaces, so the real content lands exactly where the placeholder was.
 */
const { t } = useI18n()

const ROWS = 4

// The two links under the list wrap exactly like the real ones: same tap height,
// widths taken from the translated text length (in ch), so no language changes the row count.
const linkWidths = computed(() => [t('today.changeEquipment').length, t('today.rebuild').length].map((n) => `${Math.round(n * 0.9)}ch`))
</script>

<template>
  <div class="today-sk" role="status" :aria-label="t('ui.loading')">
    <UiCard variant="hero">
      <div class="today-sk__stack" aria-hidden="true">
        <div>
          <div class="today-sk__line today-sk__line--label"><UiSkeleton width="96px" height="10px" :index="0" /></div>
          <div class="today-sk__line today-sk__line--title"><UiSkeleton width="68%" height="26px" :index="1" /></div>
          <div class="today-sk__line today-sk__line--meta"><UiSkeleton width="48%" height="12px" :index="2" /></div>
        </div>
        <UiSkeleton shape="block" height="var(--vf-size-button-xl)" :index="3" />
      </div>
    </UiCard>

    <UiSkeleton shape="block" height="var(--vf-tap-min)" :index="4" aria-hidden="true" />
    <div class="today-sk__line today-sk__line--meta" aria-hidden="true">
      <UiSkeleton width="56%" height="12px" :index="5" />
    </div>

    <UiCard>
      <div aria-hidden="true">
        <div class="today-sk__line today-sk__line--label"><UiSkeleton width="120px" height="10px" :index="5" /></div>
        <ul class="today-sk__list">
          <li v-for="n in ROWS" :key="n" class="today-sk__row">
            <span class="today-sk__main">
              <span class="today-sk__name"><UiSkeleton width="62%" height="16px" :index="5 + n" /></span>
              <span class="today-sk__detail"><UiSkeleton width="34%" height="12px" :index="6 + n" /></span>
            </span>
            <span class="today-sk__value"><UiSkeleton width="56px" height="16px" :index="6 + n" /></span>
          </li>
        </ul>
        <div class="today-sk__links">
          <span v-for="(w, i) in linkWidths" :key="i" class="today-sk__link">
            <UiSkeleton :width="w" height="14px" :index="11 + i" />
          </span>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.today-sk {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-sk__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

/* Each line box has the exact height of the text it stands in for. */
.today-sk__line {
  display: flex;
  align-items: center;
}

.today-sk__line--label {
  height: calc(var(--vf-text-xs) * var(--vf-leading-normal));
}

.today-sk__line--title {
  height: calc(var(--vf-text-xl) * var(--vf-leading-tight));
  margin-top: var(--vf-space-2);
}

.today-sk__line--meta {
  height: calc(var(--vf-text-sm) * var(--vf-leading-normal));
  margin-top: var(--vf-space-1);
}

/* Same box model as UiExerciseRow. */
.today-sk__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.today-sk__row {
  display: flex;
  align-items: center;
  gap: var(--vf-space-3);
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-3) 0;
  border-bottom: var(--vf-border-thin) solid var(--vf-color-border);
}

.today-sk__row:last-child {
  border-bottom: 0;
}

.today-sk__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.today-sk__name {
  display: flex;
  align-items: center;
  height: calc(var(--vf-text-md) * var(--vf-leading-snug));
}

.today-sk__detail {
  display: flex;
  align-items: center;
  height: calc(var(--vf-text-sm) * var(--vf-leading-normal));
}

.today-sk__value {
  flex: none;
}

.today-sk__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vf-space-2) var(--vf-space-4);
  margin-top: var(--vf-space-2);
}

.today-sk__link {
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);

  max-width: 100%;
}
</style>
