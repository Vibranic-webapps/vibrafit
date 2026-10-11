/**
 * The save status as words: the badge state plus its translated label.
 * Shared by Today, the workout screen and the summary so they never disagree.
 */
export function useSyncStatus() {
  const { t, te } = useI18n()
  const queue = useSetQueue()

  const state = queue.syncState

  const label = computed(() => {
    const sets = queue.pendingSets.value
    switch (state.value) {
      case 'synced':
        return t('sync.synced')
      case 'syncing':
        return t('sync.syncing')
      case 'waiting':
        return sets > 0 ? t('sync.waiting', { n: sets }, sets) : t('sync.waitingWorkout')
      case 'offline':
        return t('sync.offline')
      default: {
        // Failed: still retrying, or the server turned items down (they stay on the phone).
        const rejected = queue.rejectedCount.value
        if (queue.hasPending.value || rejected === 0) return t('sync.failed')
        return t('sync.rejected.count', { n: rejected }, rejected)
      }
    }
  })

  /** Why the server turned items down, in words. Empty when nothing was rejected. */
  const rejectedExplanation = computed(() => {
    const reason = queue.rejectedReason.value
    if (!reason || queue.rejectedCount.value === 0) return ''
    const key = `sync.rejected.reasons.${reason}`
    return te(key) ? t(key) : t('sync.rejected.reasons.other')
  })

  return { state, label, rejectedExplanation, pendingSets: queue.pendingSets, hasPending: queue.hasPending }
}
