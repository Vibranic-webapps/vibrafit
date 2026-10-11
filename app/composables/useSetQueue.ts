/**
 * The offline outbox (non-negotiable #6: never lose a logged set).
 *
 * How it works
 *  - Every logged set is written to localStorage FIRST (key "vf:<userId>:queue"),
 *    then a sync is attempted. The network can fail at any point; the set is
 *    already safe on the phone.
 *  - The queue holds sessions and sets. A set leaves the queue only when its
 *    clientId comes back in the sync response. A session record is always sent
 *    together with the sets that belong to it.
 *  - Each item carries a `rev` that goes up on every edit ("Fix last set",
 *    finishing the workout). An acknowledgement only removes the item if the
 *    rev that was sent is still the current one, so an edit made while a
 *    request was in flight is never lost.
 *  - Items the server rejects (`rejected` in the response) stay stored and
 *    flagged with the reason. They are not retried, and the UI says so.
 *  - Sends are idempotent on the server, so retrying is always safe.
 *  - Every change re-reads storage before writing, so two open tabs can't
 *    overwrite each other's sets.
 *
 * Flush happens on log, on `online`, on focus / page becoming visible, on a
 * 30 s timer, and with exponential backoff after a failure.
 */
import type { SyncState } from '~/components/ui/UiSyncBadge.vue'
import type { SessionRecord, SetRecord, SyncResponse } from '~/utils/workoutTypes'

export interface QueuedSession extends SessionRecord {
  rev: number
  /** The rev the server last acknowledged. Equal to `rev` = nothing left to send. */
  ackedRev?: number
  /** Reason the server rejected it. Set = stored but not retried. */
  rejected?: string
}

export interface QueuedSet extends SetRecord {
  rev: number
  rejected?: string
}

interface QueueFile {
  v: 1
  sessions: QueuedSession[]
  sets: QueuedSet[]
}

interface Group {
  session: QueuedSession
  sets: QueuedSet[]
}

const SYNC_URL: string = '/api/sessions/sync'

// Module-level on purpose: Today and the workout screen share one queue.
// Nothing writes to these on the server (init only runs in the browser).
const sessions = ref<QueuedSession[]>([])
const sets = ref<QueuedSet[]>([])
const online = ref(true)
const flushing = ref(false)
const failing = ref(false)
const storageOk = ref(true)

let userId: string | null = null
let attempts = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let flushPromise: Promise<void> | null = null
let flushAgain = false
let listening = false

const storageKey = () => userKey(userId ?? 'nobody', 'queue')

function isQueueFile(value: unknown): value is QueueFile {
  const file = value as QueueFile | null
  return !!file && Array.isArray(file.sessions) && Array.isArray(file.sets)
}

/** Fresh state from storage. Falls back to what's in memory if storage is unreadable. */
function readFile(): QueueFile {
  const memory: QueueFile = { v: 1, sessions: [...sessions.value], sets: [...sets.value] }
  if (!storageOk.value) return memory // a failed write means memory is newer than disk
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw === null) return { v: 1, sessions: [], sets: [] }
    const parsed: unknown = JSON.parse(raw)
    return isQueueFile(parsed) ? parsed : memory
  } catch {
    return memory
  }
}

/** Read-modify-write. Returns false when the browser would not store it. */
function commit(change: (file: QueueFile) => void): boolean {
  if (!userId) return false
  const file = readFile()
  change(file)
  const ok = writeJson(storageKey(), file)
  sessions.value = file.sessions
  sets.value = file.sets
  storageOk.value = ok
  return ok
}

function refreshFromStorage() {
  if (!userId) return
  const file = readFile()
  sessions.value = file.sessions
  sets.value = file.sets
}

// --- Derived state ---------------------------------------------------------------

const sessionById = (id: string) => sessions.value.find((s) => s.clientId === id)

/** A set the server won't take: rejected itself, or its session was rejected. */
function isBlocked(set: QueuedSet): boolean {
  return !!set.rejected || !!sessionById(set.sessionClientId)?.rejected
}

const pendingSets = computed(() => sets.value.filter((s) => !isBlocked(s)).length)
const pendingSessions = computed(() => sessions.value.filter((s) => !s.rejected && s.ackedRev !== s.rev).length)
const rejectedSets = computed(() => sets.value.filter(isBlocked))
const rejectedSessionsAlone = computed(() =>
  sessions.value.filter((s) => s.rejected && !sets.value.some((set) => set.sessionClientId === s.clientId))
)
const rejectedCount = computed(() => rejectedSets.value.length + rejectedSessionsAlone.value.length)
/** First rejection reason on file, for the explanation line. */
const rejectedReason = computed(
  () => rejectedSets.value.map((s) => s.rejected ?? sessionById(s.sessionClientId)?.rejected).find(Boolean)
    ?? rejectedSessionsAlone.value[0]?.rejected
    ?? null
)
const hasPending = computed(() => pendingSets.value > 0 || pendingSessions.value > 0)

const syncState = computed<SyncState>(() => {
  if (hasPending.value) {
    if (!online.value) return 'offline'
    if (flushing.value) return 'syncing'
    return failing.value ? 'failed' : 'waiting'
  }
  return rejectedCount.value > 0 ? 'failed' : 'synced'
})

// --- Writing to the queue ------------------------------------------------------------

function upsertSessionIn(file: QueueFile, session: SessionRecord) {
  const existing = file.sessions.find((s) => s.clientId === session.clientId)
  if (!existing) {
    file.sessions.push({ ...session, rev: 1 })
    return
  }
  const changed =
    existing.dayKey !== session.dayKey ||
    existing.isShort !== session.isShort ||
    existing.date !== session.date ||
    existing.startedAt !== session.startedAt ||
    existing.finishedAt !== session.finishedAt
  // Unchanged and already acknowledged: leave it (it is re-sent only if a set needs it).
  if (!changed && existing.ackedRev === existing.rev) return
  if (changed) {
    Object.assign(existing, session)
    existing.rev += 1
    delete existing.rejected // edited, so worth another try
  }
}

function enqueueSession(session: SessionRecord): boolean {
  const ok = commit((file) => upsertSessionIn(file, session))
  void flush()
  return ok
}

/** Stores a set (and its session record) on the phone, then tries to sync. */
function enqueueSet(session: SessionRecord, set: SetRecord): boolean {
  const ok = commit((file) => {
    upsertSessionIn(file, session)
    const existing = file.sets.find((s) => s.clientId === set.clientId)
    if (existing) {
      Object.assign(existing, set)
      existing.rev += 1
      delete existing.rejected
    } else {
      file.sets.push({ ...set, rev: 1 })
    }
  })
  void flush()
  return ok
}

// --- Syncing ---------------------------------------------------------------------------

function buildBatch(file: QueueFile): Group[] {
  const groups: Group[] = []
  let setCount = 0
  const ordered = [...file.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const session of ordered) {
    if (session.rejected) continue
    const mine = file.sets.filter((s) => s.sessionClientId === session.clientId && !s.rejected)
    if (session.ackedRev === session.rev && mine.length === 0) continue
    if (groups.length >= SYNC_MAX_SESSIONS || setCount >= SYNC_MAX_SETS) break
    const take = mine.slice(0, SYNC_MAX_SETS - setCount)
    groups.push({ session, sets: take })
    setCount += take.length
  }
  return groups
}

/** The wire shape: only the fields of the contract, no queue bookkeeping. */
function toBody(groups: Group[]) {
  return {
    sessions: groups.map(({ session: s }) => ({
      clientId: s.clientId,
      dayKey: s.dayKey,
      isShort: s.isShort,
      date: s.date,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
    })),
    sets: groups.flatMap((g) =>
      g.sets.map((s) => ({
        clientId: s.clientId,
        sessionClientId: s.sessionClientId,
        exerciseSlug: s.exerciseSlug,
        setNumber: s.setNumber,
        amount: s.amount,
        loadGrams: s.loadGrams,
        feeling: s.feeling,
        skippedForPain: s.skippedForPain,
        loggedAt: s.loggedAt,
      }))
    ),
  }
}

/** Applies the server's answer. Returns how many items it settled (acked or rejected). */
function applyResponse(groups: Group[], response: SyncResponse): number {
  const sentSessionRev = new Map(groups.map((g) => [g.session.clientId, g.session.rev] as const))
  const sentSetRev = new Map(groups.flatMap((g) => g.sets.map((s) => [s.clientId, s.rev] as const)))
  const ackedSessions = new Set(response.sessions)
  const ackedSets = new Set(response.sets)
  let settled = 0

  commit((file) => {
    // Sets first: a set is gone only if the rev we sent is still current.
    file.sets = file.sets.filter((s) => {
      const gone = ackedSets.has(s.clientId) && sentSetRev.get(s.clientId) === s.rev
      if (gone) settled += 1
      return !gone
    })
    for (const session of file.sessions) {
      if (ackedSessions.has(session.clientId) && sentSessionRev.get(session.clientId) === session.rev) {
        session.ackedRev = session.rev
        settled += 1
      }
    }
    for (const item of response.rejected) {
      const reason = item.reason || 'rejected'
      if (item.kind === 'set') {
        const set = file.sets.find((s) => s.clientId === item.clientId)
        if (set && sentSetRev.get(set.clientId) === set.rev) {
          set.rejected = reason
          settled += 1
        }
      } else {
        const session = file.sessions.find((s) => s.clientId === item.clientId)
        if (session && sentSessionRev.get(session.clientId) === session.rev) {
          session.rejected = reason
          settled += 1
        }
      }
    }
    // An acknowledged session nobody references any more can go.
    file.sessions = file.sessions.filter(
      (s) => s.rejected || s.ackedRev !== s.rev || file.sets.some((set) => set.sessionClientId === s.clientId)
    )
  })
  return settled
}

function httpStatus(error: unknown): number | null {
  const e = error as { statusCode?: number; status?: number; response?: { status?: number } } | null
  return e?.statusCode ?? e?.status ?? e?.response?.status ?? null
}

/**
 * One request. A 400 means something in the batch is malformed (should never
 * happen): split by workout so one bad item can't block the rest, and flag
 * the offender instead of retrying it forever.
 */
async function sendGroups(groups: Group[]): Promise<number> {
  try {
    const response = await $fetch<SyncResponse>(SYNC_URL, { method: 'POST', body: toBody(groups) })
    return applyResponse(groups, response)
  } catch (error) {
    if (httpStatus(error) !== 400) throw error
    if (groups.length > 1) {
      let settled = 0
      for (const group of groups) settled += await sendGroups([group])
      return settled
    }
    const [only] = groups
    if (!only) return 0
    commit((file) => {
      const session = file.sessions.find((s) => s.clientId === only.session.clientId)
      if (session) session.rejected = 'invalid_input'
    })
    return 1
  }
}

async function runFlush(): Promise<void> {
  if (!userId || !hasPending.value) return
  flushing.value = true
  try {
    // Several requests when more than one request's worth is waiting.
    for (let round = 0; round < 50; round += 1) {
      const groups = buildBatch(readFile())
      if (groups.length === 0) break
      const settled = await sendGroups(groups)
      // The server answered but settled nothing: stop, or we'd loop forever.
      if (settled === 0) throw new Error('sync_no_progress')
    }
    failing.value = false
    attempts = 0
  } catch {
    failing.value = true
    attempts += 1
    clearTimeout(retryTimer)
    const delay = Math.min(SYNC_BACKOFF_MAX_MS, SYNC_BACKOFF_START_MS * 2 ** (attempts - 1))
    retryTimer = setTimeout(() => void flush(), delay)
  } finally {
    flushing.value = false
  }
}

/** Sends whatever is waiting. Safe to call any time; calls while a send is running are folded into one more pass. */
function flush(): Promise<void> {
  if (!userId) return Promise.resolve()
  if (flushPromise) {
    flushAgain = true
    return flushPromise
  }
  flushPromise = runFlush().finally(() => {
    flushPromise = null
    if (flushAgain) {
      flushAgain = false
      void flush()
    }
  })
  return flushPromise
}

// --- Lifecycle -------------------------------------------------------------------------

function attachListeners() {
  if (listening || !import.meta.client) return
  listening = true
  online.value = navigator.onLine
  window.addEventListener('online', () => {
    online.value = true
    void flush()
  })
  window.addEventListener('offline', () => {
    online.value = false
  })
  window.addEventListener('focus', () => void flush())
  window.addEventListener('pageshow', () => void flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush()
  })
  // Another tab changed the queue.
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey()) refreshFromStorage()
  })
  setInterval(() => {
    if (hasPending.value) void flush()
  }, SYNC_INTERVAL_MS)
}

/** Call once the signed-in user is known (see plugins/sync-queue.client.ts). */
function init(id: string) {
  if (!import.meta.client) return
  attachListeners()
  if (userId !== id) {
    userId = id
    storageOk.value = true
    attempts = 0
    failing.value = false
    refreshFromStorage()
  }
  void flush()
}

/** Signed out: forget what's in memory. The stored queue stays for the next sign-in. */
function reset() {
  userId = null
  sessions.value = []
  sets.value = []
  failing.value = false
}

export function useSetQueue() {
  return {
    sessions: readonly(sessions),
    sets: readonly(sets),
    online: readonly(online),
    flushing: readonly(flushing),
    failing: readonly(failing),
    /** false = the browser refused to store (quota/private mode): warn the user. */
    storageOk: readonly(storageOk),
    pendingSets,
    pendingSessions,
    rejectedCount,
    rejectedReason,
    hasPending,
    syncState,
    init,
    reset,
    enqueueSession,
    enqueueSet,
    flush,
    /** Is anything for this workout still waiting to sync? */
    hasUnsyncedFor: (sessionClientId: string) =>
      sets.value.some((s) => s.sessionClientId === sessionClientId && !isBlocked(s)) ||
      sessions.value.some((s) => s.clientId === sessionClientId && !s.rejected && s.ackedRev !== s.rev),
  }
}
