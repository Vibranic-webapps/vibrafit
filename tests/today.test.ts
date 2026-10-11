// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inProgressCutoff, isInProgress, nextDayKey } from '../shared/utils/today.ts'

test('nextDayKey: no program means no next day', () => {
  assert.equal(nextDayKey([], null), null)
  assert.equal(nextDayKey([], 'A'), null)
})

test('nextDayKey: nothing trained yet starts at the first day', () => {
  assert.equal(nextDayKey(['A', 'B'], null), 'A')
})

test('nextDayKey: rotates after the last trained day and wraps around', () => {
  assert.equal(nextDayKey(['A', 'B'], 'A'), 'B')
  assert.equal(nextDayKey(['A', 'B'], 'B'), 'A')
  assert.equal(nextDayKey(['A', 'B', 'C'], 'B'), 'C')
  assert.equal(nextDayKey(['A', 'B', 'C'], 'C'), 'A')
})

test('nextDayKey: a last day that no longer exists falls back to the first day', () => {
  assert.equal(nextDayKey(['A', 'B'], 'Z'), 'A')
})

test('nextDayKey: a single-day program always returns that day', () => {
  assert.equal(nextDayKey(['A'], 'A'), 'A')
  assert.equal(nextDayKey(['A'], null), 'A')
})

test('isInProgress: unfinished and started within 12 hours', () => {
  const now = new Date('2026-10-11T12:00:00Z')
  assert.equal(inProgressCutoff(now).toISOString(), '2026-10-11T00:00:00.000Z')
  assert.equal(isInProgress({ startedAt: new Date('2026-10-11T11:00:00Z'), finishedAt: null }, now), true)
  assert.equal(isInProgress({ startedAt: new Date('2026-10-11T00:00:00Z'), finishedAt: null }, now), true) // exactly 12 h
  assert.equal(isInProgress({ startedAt: new Date('2026-10-10T23:59:59Z'), finishedAt: null }, now), false)
  assert.equal(isInProgress({ startedAt: new Date('2026-10-11T11:00:00Z'), finishedAt: new Date('2026-10-11T11:30:00Z') }, now), false)
})
