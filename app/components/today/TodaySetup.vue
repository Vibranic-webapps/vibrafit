<script setup lang="ts">
/**
 * Today before there is a workout: step 1 "Add your equipment", step 2 "Build
 * your program". Same card, two copies. The build button keeps its text while
 * loading; on failure it becomes the retry.
 */
const props = defineProps<{
  step: 'equipment' | 'program'
  loading?: boolean
  error?: boolean
}>()

defineEmits<{ build: [] }>()

const { t } = useI18n()
const key = computed(() => (props.step === 'equipment' ? 'today.noEquipment' : 'today.noProgram'))
</script>

<template>
  <UiCard variant="hero">
    <div class="today-setup">
      <div>
        <p class="vf-label">{{ t(`${key}.label`) }}</p>
        <p class="vf-display today-setup__title">{{ t(`${key}.title`) }}</p>
        <p v-if="error" class="today-setup__error" role="alert">{{ t('today.noProgram.error') }}</p>
        <p v-else class="vf-muted today-setup__body">{{ t(`${key}.body`) }}</p>
      </div>
      <UiButton v-if="step === 'equipment'" variant="primary" size="xl" full-width href="/equipment">
        {{ t('today.noEquipment.cta') }}
      </UiButton>
      <template v-else>
        <UiButton variant="primary" size="xl" full-width :loading="loading" @click="$emit('build')">
          {{ error ? t('today.tryAgain') : t('today.noProgram.cta') }}
        </UiButton>
        <NuxtLink to="/equipment" class="today-setup__link">{{ t('today.noProgram.changeFirst') }}</NuxtLink>
      </template>
    </div>
  </UiCard>
</template>

<style scoped>
.today-setup {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.today-setup__title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-2);
}

.today-setup__body {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.today-setup__error {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}

.today-setup__link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
}
</style>
