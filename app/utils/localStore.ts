/**
 * Thin, defensive wrapper around localStorage. Everything the offline queue
 * and the workout drafts keep on the phone goes through here.
 *
 * Storage can throw (private mode, quota, blocked site data), so every call is
 * wrapped: reads fall back, writes report success so callers can warn the user
 * instead of silently losing a set (non-negotiable #6).
 *
 * Keys are namespaced per user ("vf:<userId>:<name>"), so a second account on
 * the same phone never sees (or syncs) someone else's sets.
 */

export function userKey(userId: string, name: string): string {
  return `vf:${userId}:${name}`
}

/** Parsed JSON at `key`, or `fallback` when missing, unreadable or corrupt. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** Writes JSON. Returns false when the browser refused (quota, private mode). */
export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Client-generated id for sessions and sets. crypto.randomUUID needs a secure
 * context (https or localhost); the fallback keeps testing on a LAN address
 * (plain http) working. Both satisfy the server's id rule (A-Z a-z 0-9 -, 8-64).
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Removes everything this app keeps on the phone for one user (queue, drafts,
 * cached program). Used after account deletion: rule #7 says deleting an
 * account deletes everything, and that includes this device.
 */
export function clearUserData(userId: string): void {
  try {
    const prefix = userKey(userId, '')
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // Storage unavailable: there is nothing stored to remove.
  }
}
