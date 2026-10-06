<script setup lang="ts">
import { CalendarCheck, Dumbbell, History, User } from 'lucide-vue-next'

/**
 * Bottom tab bar: Today · History · Equipment · You. Orange marks the
 * active tab; the label is always visible too, so meaning never rests on
 * colour alone. Safe-area padding keeps it clear of the home indicator.
 *
 * Active state follows the current route by default. `forceActive` exists
 * only so the /design style guide can show the "active" look without real
 * routing — real app usage should leave it unset.
 */
type TabKey = 'today' | 'history' | 'equipment' | 'you'

const props = defineProps<{ forceActive?: TabKey }>()

const route = useRoute()
const { t } = useI18n()

const tabs: { key: TabKey; to: string; icon: typeof CalendarCheck; label: () => string }[] = [
  { key: 'today', to: '/', icon: CalendarCheck, label: () => t('tabs.today') },
  { key: 'history', to: '/history', icon: History, label: () => t('tabs.history') },
  { key: 'equipment', to: '/equipment', icon: Dumbbell, label: () => t('tabs.equipment') },
  { key: 'you', to: '/you', icon: User, label: () => t('tabs.you') },
]

function isActive(tab: { key: TabKey; to: string }) {
  if (props.forceActive) return props.forceActive === tab.key
  return route.path === tab.to
}
</script>

<template>
  <nav class="vf-tabbar" :aria-label="t('tabs.label')">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      class="vf-tabbar__tab"
      :class="{ 'vf-tabbar__tab--active': isActive(tab) }"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <component :is="tab.icon" :size="22" aria-hidden="true" />
      <span class="vf-tabbar__label">{{ tab.label() }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.vf-tabbar {
  display: flex;
  justify-content: space-around;
  border-top: var(--vf-border-thin) solid var(--vf-color-border);
  background: var(--vf-color-surface);
  padding: var(--vf-space-2) var(--vf-space-3);
  padding-bottom: max(var(--vf-space-2), env(safe-area-inset-bottom));
}

.vf-tabbar__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--vf-space-1);
  min-width: var(--vf-tap-min);
  min-height: var(--vf-tap-min);
  padding: var(--vf-space-1) var(--vf-space-2);
  color: var(--vf-color-muted);
  text-decoration: none;
  font-family: var(--vf-font-body);
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-xs);
}

.vf-tabbar__tab--active {
  color: var(--vf-color-accent-text);
}
</style>
