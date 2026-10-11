import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brusselsDate, daysBetween, isIsoDate } from '../shared/utils/brusselsDate.ts'

test('uses the Brussels date, not UTC', () => {
  // 23:30 UTC on 11 Oct = 01:30 on 12 Oct in Brussels (CEST, UTC+2)
  assert.equal(brusselsDate(new Date('2026-10-11T23:30:00Z')), '2026-10-12')
  // 22:30 UTC on 11 Dec = 23:30 on 11 Dec in Brussels (CET, UTC+1)
  assert.equal(brusselsDate(new Date('2026-12-11T22:30:00Z')), '2026-12-11')
  assert.equal(brusselsDate(new Date('2026-12-11T23:30:00Z')), '2026-12-12')
})

test('handles the DST switch nights', () => {
  // Clocks go back on 25 Oct 2026 at 03:00 CEST -> 02:00 CET
  assert.equal(brusselsDate(new Date('2026-10-24T22:30:00Z')), '2026-10-25')
  assert.equal(brusselsDate(new Date('2026-03-28T23:30:00Z')), '2026-03-29')
})

test('isIsoDate accepts real dates only', () => {
  assert.equal(isIsoDate('2026-10-11'), true)
  assert.equal(isIsoDate('2028-02-29'), true)
  for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '11-10-2026', '', null, 20261011]) {
    assert.equal(isIsoDate(bad), false, String(bad))
  }
})

test('daysBetween counts calendar days across DST', () => {
  assert.equal(daysBetween('2026-10-11', '2026-10-12'), 1)
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(daysBetween('2026-10-12', '2026-10-11'), -1)
})
