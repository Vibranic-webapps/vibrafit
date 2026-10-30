/**
 * "Auto-continue after rest": when on (the default), the next set or exercise
 * opens by itself the moment the rest timer hits zero. Saved on this phone, per
 * user, so it survives reloads. Read on mount only (localStorage doesn't exist
 * on the server), so the first paint always uses the default.
 */
const DEFAULT_AUTO_CONTINUE = true

export function useAutoContinue() {
  const user = useAuthUser()
  const enabled = useState<boolean>('vf-auto-continue', () => DEFAULT_AUTO_CONTINUE)

  const key = () => (user.value ? userKey(user.value.id, 'autoContinue') : null)

  onMounted(() => {
    const k = key()
    if (k) enabled.value = readJson<boolean>(k, DEFAULT_AUTO_CONTINUE)
  })

  function toggle() {
    enabled.value = !enabled.value
    const k = key()
    if (k) writeJson(k, enabled.value)
  }

  return { enabled, toggle }
}
