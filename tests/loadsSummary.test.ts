import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildableLoads, type Equipment } from '../shared/utils/loads.ts'
import { summarizeLoads } from '../shared/utils/loadsSummary.ts'

test('summary of no loads is empty', () => {
  assert.deepEqual(summarizeLoads([]), { count: 0, minGrams: null, maxGrams: null })
})

test("summary of Kilian's gear spans the lightest to the heaviest load", () => {
  const gear: Equipment = {
    handles: { count: 2, grams: 0 },
    plates: [{ grams: 1000, count: 4 }, { grams: 2000, count: 2 }],
    fixed: [{ grams: 5000, count: 1, label: 'Weight ball' }],
  }
  const options = buildableLoads(gear).filter((o) => o.grams > 0)
  const summary = summarizeLoads(options)
  assert.equal(summary.count, options.length)
  assert.equal(summary.minGrams, 2000)
  assert.equal(summary.maxGrams, 8000)
})
