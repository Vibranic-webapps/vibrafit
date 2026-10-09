// Run: npm test   (Node's built-in test runner; Node 24 runs .ts directly)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildableLoads, loadSteps, nextLoadDown, nextLoadUp, type Equipment } from '../shared/utils/loads.ts'

// Kilian's real gear (01 Specs & Features/Starter program + equipment).
// Handle weight still unknown -> 0 here, a real weight in its own test.
const kilian = (handleGrams = 0): Equipment => ({
  handles: { count: 2, grams: handleGrams },
  plates: [
    { grams: 1000, count: 4 },
    { grams: 2000, count: 2 },
  ],
  fixed: [{ grams: 5000, count: 1, label: 'Weight ball' }],
})

const sum = (plates: number[]) => plates.reduce((a, b) => a + b, 0)

test("Kilian's gear: 2 kg pair, 4 kg pair, 8 kg single (plates only)", () => {
  const options = buildableLoads(kilian())
  assert.deepEqual(loadSteps(options, 'pair'), [0, 2000, 4000])
  assert.deepEqual(loadSteps(options, 'single'), [0, 2000, 4000, 5000, 6000, 8000])
})

test('handle weight is added to every dumbbell load, never to fixed weights', () => {
  const options = buildableLoads(kilian(1500))
  assert.deepEqual(loadSteps(options, 'pair'), [1500, 3500, 5500])
  assert.deepEqual(
    options.filter((o) => o.mode === 'single').map((o) => `${o.kind}:${o.grams}`),
    ['dumbbell:1500', 'dumbbell:3500', 'fixed:5000', 'dumbbell:5500', 'dumbbell:7500', 'dumbbell:9500'],
  )
})

test('every dumbbell build is symmetric and adds up to its load', () => {
  for (const handle of [0, 1500]) {
    for (const o of buildableLoads(kilian(handle)).filter((o) => o.kind === 'dumbbell')) {
      assert.equal(o.dumbbells.length, o.mode === 'pair' ? 2 : 1)
      for (const side of o.dumbbells) assert.equal(handle + 2 * sum(side), o.grams)
    }
  }
})

test('a pair never uses more plates than exist', () => {
  for (const o of buildableLoads(kilian()).filter((o) => o.mode === 'pair')) {
    const used = o.dumbbells.flat().flatMap((g) => [g, g]) // each side plate is mirrored
    assert.ok(used.filter((g) => g === 1000).length <= 4)
    assert.ok(used.filter((g) => g === 2000).length <= 2)
  }
})

test('prefers the build with the fewest plates', () => {
  const options = buildableLoads(kilian())
  const single4 = options.find((o) => o.mode === 'single' && o.grams === 4000)
  assert.deepEqual(single4?.dumbbells, [[2000]]) // not [1000, 1000]
  const pair4 = options.find((o) => o.mode === 'pair' && o.grams === 4000)
  assert.deepEqual(
    pair4?.dumbbells.map((d) => sum(d)),
    [2000, 2000],
  )
})

test('an odd plate cannot go on a dumbbell', () => {
  const options = buildableLoads({ handles: { count: 1, grams: 2000 }, plates: [{ grams: 5000, count: 1 }], fixed: [] })
  assert.deepEqual(loadSteps(options, 'single'), [2000])
})

test('one handle means no pairs; no handles means only fixed weights', () => {
  assert.deepEqual(loadSteps(buildableLoads({ ...kilian(), handles: { count: 1, grams: 0 } }), 'pair'), [])
  const none = buildableLoads({ ...kilian(), handles: { count: 0, grams: 0 } })
  assert.deepEqual(
    none.map((o) => `${o.mode}:${o.grams}`),
    ['single:5000'],
  )
})

test('two identical fixed weights also make a pair', () => {
  const options = buildableLoads({ handles: { count: 0, grams: 0 }, plates: [], fixed: [{ grams: 8000, count: 2, label: 'Kettlebell' }] })
  assert.deepEqual(loadSteps(options, 'pair'), [8000])
  assert.deepEqual(loadSteps(options, 'single'), [8000])
})

test('the same plate weight listed twice is merged', () => {
  const split = buildableLoads({
    handles: { count: 2, grams: 0 },
    plates: [
      { grams: 1000, count: 1 },
      { grams: 1000, count: 3 },
    ],
    fixed: [],
  })
  assert.deepEqual(loadSteps(split, 'pair'), [0, 2000])
})

test('nextLoadUp / nextLoadDown walk the real steps and stop at the ends', () => {
  const options = buildableLoads(kilian())
  assert.equal(nextLoadUp(options, 'single', 4000), 5000) // the ball is a real single option
  assert.equal(nextLoadUp(options, 'single', 8000), null)
  assert.equal(nextLoadUp(options, 'pair', 4000), null) // max pair -> engine must pick a harder variation
  assert.equal(nextLoadUp(options, 'pair', 3000), 4000) // off-grid current -> next real step
  assert.equal(nextLoadDown(options, 'pair', 4000), 2000)
  assert.equal(nextLoadDown(options, 'pair', 0), null)
})

test('rejects anything that is not whole grams', () => {
  assert.throws(() => buildableLoads({ ...kilian(), handles: { count: 2, grams: 1.5 } }), RangeError)
  assert.throws(() => buildableLoads({ ...kilian(), plates: [{ grams: -1000, count: 2 }] }), RangeError)
  assert.throws(() => buildableLoads({ ...kilian(), plates: [{ grams: 0, count: 2 }] }), RangeError)
  assert.throws(() => buildableLoads({ ...kilian(), plates: [{ grams: 1000, count: 0.5 }] }), RangeError)
})

test('a big plate collection stays fast (no combinatorial blow-up)', () => {
  const plates = [500, 1000, 1250, 2000, 2500, 5000].map((grams) => ({ grams, count: 8 }))
  const start = performance.now()
  const options = buildableLoads({ handles: { count: 2, grams: 2000 }, plates, fixed: [] })
  assert.ok(performance.now() - start < 500, 'took longer than 500 ms')
  for (const o of options) for (const side of o.dumbbells) assert.equal(2000 + 2 * sum(side), o.grams)
})
