// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  collapseSessions,
  collapseSets,
  mergeSessionUpdate,
  parseSyncBody,
  sessionDateProblem,
  SYNC_LIMITS,
  type SessionIn,
  type SetIn,
} from '../shared/utils/sessionSync.ts'

const session = (over: Partial<SessionIn> = {}): SessionIn => ({
  clientId: 'sess-0001-aaaa',
  dayKey: 'A',
  isShort: false,
  date: '2026-10-11',
  startedAt: '2026-10-11T10:00:00.000Z',
  finishedAt: null,
  ...over,
})

const set = (over: Partial<SetIn> = {}): SetIn => ({
  clientId: 'set-0001-aaaa',
  sessionClientId: 'sess-0001-aaaa',
  exerciseSlug: 'goblet-squat',
  setNumber: 1,
  amount: 10,
  loadGrams: 7850,
  feeling: 'good',
  skippedForPain: false,
  loggedAt: '2026-10-11T10:05:00.000Z',
  ...over,
})

// --- Body shape ---------------------------------------------------------------

test('parseSyncBody: a good body comes back clean', () => {
  const body = { sessions: [session()], sets: [set(), set({ clientId: 'set-0002-aaaa', amount: null, feeling: null, skippedForPain: true })] }
  assert.deepEqual(parseSyncBody(body), body)
  assert.deepEqual(parseSyncBody({ sessions: [], sets: [] }), { sessions: [], sets: [] })
})

test('parseSyncBody: wrong shapes are refused', () => {
  for (const bad of [null, 'x', [], {}, { sessions: [] }, { sessions: {}, sets: [] }, { sessions: [], sets: 'x' }]) {
    assert.equal(parseSyncBody(bad), null)
  }
})

test('parseSyncBody: the caps hold (20 sessions, 300 sets)', () => {
  const sessions = (n: number) => Array.from({ length: n }, (_, i) => session({ clientId: `sess-${String(i).padStart(4, '0')}-aaaa` }))
  const sets = (n: number) => Array.from({ length: n }, (_, i) => set({ clientId: `set-${String(i).padStart(4, '0')}-aaaa` }))
  assert.ok(parseSyncBody({ sessions: sessions(SYNC_LIMITS.sessions), sets: sets(SYNC_LIMITS.sets) }))
  assert.equal(parseSyncBody({ sessions: sessions(SYNC_LIMITS.sessions + 1), sets: [] }), null)
  assert.equal(parseSyncBody({ sessions: [], sets: sets(SYNC_LIMITS.sets + 1) }), null)
})

test('parseSyncBody: field rules (ids, numbers, enums, timestamps)', () => {
  const refused = (body: { sessions?: unknown[]; sets?: unknown[] }) => parseSyncBody({ sessions: [], sets: [], ...body }) === null
  assert.ok(refused({ sessions: [session({ clientId: 'short' })] }))
  assert.ok(refused({ sessions: [session({ clientId: 'has spaces in it' })] }))
  assert.ok(refused({ sessions: [session({ clientId: 'x'.repeat(65) })] }))
  assert.ok(refused({ sessions: [session({ isShort: 'no' as unknown as boolean })] }))
  assert.ok(refused({ sessions: [session({ startedAt: 'yesterday' })] }))
  assert.ok(refused({ sessions: [session({ startedAt: '2026-10-11' })] })) // a timestamp, not a date
  assert.ok(refused({ sessions: [session({ finishedAt: undefined as unknown as null })] }))
  assert.ok(refused({ sets: [set({ setNumber: 0 })] }))
  assert.ok(refused({ sets: [set({ setNumber: 21 })] }))
  assert.ok(refused({ sets: [set({ setNumber: 1.5 })] }))
  assert.ok(refused({ sets: [set({ amount: -1 })] }))
  assert.ok(refused({ sets: [set({ amount: 3601 })] }))
  assert.ok(refused({ sets: [set({ amount: 10.5 })] }))
  assert.ok(refused({ sets: [set({ loadGrams: 200_001 })] }))
  assert.ok(refused({ sets: [set({ loadGrams: 7.85 })] })) // kilograms by mistake
  assert.ok(refused({ sets: [set({ feeling: 'great' as 'good' })] }))
  assert.ok(refused({ sets: [set({ exerciseSlug: '' })] }))
  assert.ok(!refused({ sets: [set({ amount: 0, loadGrams: 0 })] })) // the edges are fine
  assert.ok(!refused({ sets: [set({ amount: 3600, loadGrams: 200_000, setNumber: 20 })] }))
})

// --- Date window ---------------------------------------------------------------

test('sessionDateProblem: today, one day ahead and up to 60 days back are fine', () => {
  const today = '2026-10-11'
  assert.equal(sessionDateProblem('2026-10-11', today), null)
  assert.equal(sessionDateProblem('2026-10-12', today), null) // +1
  assert.equal(sessionDateProblem('2026-08-12', today), null) // -60
})

test('sessionDateProblem: 2 days ahead and 61 days back are out of range', () => {
  const today = '2026-10-11'
  assert.equal(sessionDateProblem('2026-10-13', today), 'date_out_of_range')
  assert.equal(sessionDateProblem('2026-08-11', today), 'date_out_of_range') // -61
})

test('sessionDateProblem: not a real calendar date', () => {
  for (const bad of ['2026-02-30', '2026-13-01', 'nope', '', '2026-1-1']) assert.equal(sessionDateProblem(bad, '2026-10-11'), 'invalid_date')
})

test('sessionDateProblem: the window follows real calendar days across a year change and a leap day', () => {
  assert.equal(sessionDateProblem('2027-01-01', '2026-12-31'), null)
  assert.equal(sessionDateProblem('2027-01-02', '2026-12-31'), 'date_out_of_range')
  assert.equal(sessionDateProblem('2024-12-31', '2025-03-01'), null) // exactly 60 days (Feb 2025 has 28)
  assert.equal(sessionDateProblem('2024-12-30', '2025-03-01'), 'date_out_of_range') // 61
  assert.equal(sessionDateProblem('2024-01-01', '2024-03-01'), null) // leap year: 60 days, Feb has 29
})

// --- Merge rules ---------------------------------------------------------------

const t = (iso: string) => new Date(iso)

test('mergeSessionUpdate: finishing sets finishedAt', () => {
  assert.deepEqual(mergeSessionUpdate({ isShort: false, finishedAt: null }, { isShort: false, finishedAt: t('2026-10-11T11:00:00Z') }), {
    finishedAt: t('2026-10-11T11:00:00Z'),
  })
})

test('mergeSessionUpdate: a stale resend with finishedAt null never un-finishes', () => {
  const finished = t('2026-10-11T11:00:00Z')
  assert.equal(mergeSessionUpdate({ isShort: false, finishedAt: finished }, { isShort: false, finishedAt: null }), null)
})

test('mergeSessionUpdate: once set, finishedAt does not move', () => {
  const patch = mergeSessionUpdate({ isShort: false, finishedAt: t('2026-10-11T11:00:00Z') }, { isShort: true, finishedAt: t('2026-10-11T12:00:00Z') })
  assert.deepEqual(patch, { isShort: true })
})

test('mergeSessionUpdate: isShort may change; an identical resend changes nothing', () => {
  assert.deepEqual(mergeSessionUpdate({ isShort: false, finishedAt: null }, { isShort: true, finishedAt: null }), { isShort: true })
  assert.equal(mergeSessionUpdate({ isShort: true, finishedAt: null }, { isShort: true, finishedAt: null }), null)
})

test('collapseSessions: duplicates in one request fold by the same rules (finishedAt sticks)', () => {
  const [one] = collapseSessions([session({ finishedAt: '2026-10-11T11:00:00.000Z', isShort: false }), session({ finishedAt: null, isShort: true })])
  assert.equal(one!.finishedAt, '2026-10-11T11:00:00.000Z')
  assert.equal(one!.isShort, true)
  assert.equal(collapseSessions([session(), session({ clientId: 'sess-0002-aaaa' })]).length, 2)
})

test('collapseSets: duplicates in one request keep the last ("fix last set")', () => {
  const sets = collapseSets([set({ amount: 8 }), set({ clientId: 'set-0002-aaaa' }), set({ amount: 9 })])
  assert.equal(sets.length, 2)
  assert.equal(sets.find((s) => s.clientId === 'set-0001-aaaa')!.amount, 9)
})
