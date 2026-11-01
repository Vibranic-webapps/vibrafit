<script setup lang="ts">
/**
 * Layout for the tab pages (Today, Equipment, You): the page, then the bottom
 * tab bar, sticky so it stays in reach while the page scrolls. Pages opt in
 * with definePageMeta({ layout: 'tabs' }). Workout mode and the sign-in
 * screens deliberately don't: no way to tab away mid-set.
 * Pull down at the top of a page to refresh its data: the page says what that
 * means with onPullRefresh(); the tab bar stays put, outside the pulled area.
 */
const refreshHandler = providePullRefresh()
</script>

<template>
  <div class="tabs-layout">
    <div class="tabs-layout__page">
      <UiPullToRefresh :refresh="refreshHandler">
        <slot />
      </UiPullToRefresh>
    </div>
    <div class="tabs-layout__bar">
      <UiTabBar />
    </div>
  </div>
</template>

<style scoped>
.tabs-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.tabs-layout__page {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tabs-layout__bar {
  position: sticky;
  bottom: 0;
  z-index: var(--vf-z-tabbar);
}
</style>
