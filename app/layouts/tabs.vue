<script setup lang="ts">
/**
 * Layout for the tab pages (Today, Equipment, You): the page, then the bottom
 * tab bar, sticky so it stays in reach while the page scrolls. Pages opt in
 * with definePageMeta({ layout: 'tabs' }). Workout mode and the sign-in
 * screens deliberately don't: no way to tab away mid-set.
 * Pull down at the top of a page to refresh its data: the page says what that
 * means with onPullRefresh(); the tab bar stays put, outside the pulled area.
 * The tab bar's real height (safe area included) is published as --vf-tabbar-h,
 * so a page can pin its own bar (like Save) right above the tab bar.
 */
const refreshHandler = providePullRefresh()

const rootEl = ref<HTMLElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  const bar = barEl.value
  if (!bar || typeof ResizeObserver === 'undefined') return
  const publish = () => rootEl.value?.style.setProperty('--vf-tabbar-h', `${bar.offsetHeight}px`)
  publish()
  resizeObserver = new ResizeObserver(publish)
  resizeObserver.observe(bar)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div ref="rootEl" class="tabs-layout">
    <div class="tabs-layout__page">
      <UiPullToRefresh :refresh="refreshHandler">
        <slot />
      </UiPullToRefresh>
    </div>
    <div ref="barEl" class="tabs-layout__bar">
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
