import type { InjectionKey, Ref } from 'vue'

/** What a page does when the user pulls down. Resolve = "up to date", reject = "couldn't refresh". */
export type PullRefreshHandler = () => Promise<unknown>

const KEY: InjectionKey<Ref<PullRefreshHandler | null>> = Symbol('pull-refresh')

/** Layout side (layouts/tabs.vue): holds the active page's handler and offers it to the page. */
export function providePullRefresh(): Ref<PullRefreshHandler | null> {
  const handler = ref<PullRefreshHandler | null>(null)
  provide(KEY, handler)
  return handler
}

/**
 * Page side: say what "refresh" means on this page. Only refetch data; never reload the
 * app, and never overwrite what the user is typing. A page that doesn't call this simply
 * doesn't react to a pull.
 */
export function onPullRefresh(fn: PullRefreshHandler): void {
  const handler = inject(KEY, null)
  if (!handler) return
  handler.value = fn
  onBeforeUnmount(() => {
    if (handler.value === fn) handler.value = null
  })
}
