/**
 * Starts the offline sync queue and the workout drafts for whoever is signed
 * in, on every page, so sets logged earlier get sent as soon as the app opens
 * (not only when the user happens to visit Today or a workout).
 */
export default defineNuxtPlugin(() => {
  const user = useAuthUser()
  const queue = useSetQueue()
  const drafts = useWorkoutDraft()

  watch(
    () => user.value?.id ?? null,
    (id) => {
      if (id) {
        drafts.init(id)
        queue.init(id)
      } else {
        queue.reset()
        drafts.reset()
      }
    },
    { immediate: true }
  )
})
