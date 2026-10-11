// Run: npm test   (Node's built-in test runner; Node 24 runs .ts directly)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildableLoads, loadSteps } from '../shared/utils/loads.ts'
import {
  explainStoredPick,
  generateProgram,
  pickLoad,
  shortVersion,
  type GeneratedDay,
  type ProgramEquipment,
} from '../server/utils/program.ts'
import { EXERCISES, EXERCISE_LADDERS, exerciseKey } from '../server/data/exercises.ts'
import { STARTER_PROGRAM } from '../server/data/program.ts'
import en from '../i18n/locales/en.json' with { type: 'json' }

// Kilian's real gear (01 Specs & Features/Starter program + equipment).
const kilian = (handleGrams = 1850): ProgramEquipment => ({
  handles: { count: 2, grams: handleGrams },
  plates: [
    { grams: 1000, count: 4 },
    { grams: 2000, count: 2 },
  ],
  fixed: [{ grams: 5000, count: 1, label: 'Weight ball' }],
  bands: [{ label: 'Orange loop band', resistance: '20 kg', count: 1 }],
})

const nothing: ProgramEquipment = { handles: { count: 0, grams: 0 }, plates: [], fixed: [], bands: [] }

const generate = (equipment: ProgramEquipment) => generateProgram(STARTER_PROGRAM, equipment, EXERCISES)
const day = (days: GeneratedDay[], key: string) => days.find((d) => d.key === key)!.picks
const summary = (picks: GeneratedDay['picks']) => picks.map((p) => `${p.slug}:${p.loadMode ?? '-'}:${p.loadGrams ?? '-'}`)

// --- Kilian's gear ---------------------------------------------------------

test("Kilian's gear with a 1850 g handle: loads at or just below the note's starting loads", () => {
  const days = generate(kilian())
  assert.deepEqual(summary(day(days, 'A')), [
    'goblet-squat:single:7850',
    'push-up:-:-',
    'one-arm-row:single:7850',
    'band-pull-apart:-:-',
    'overhead-press:pair:3850',
    'plank:-:-',
  ])
  assert.deepEqual(summary(day(days, 'B')), [
    'romanian-deadlift:pair:3850',
    'reverse-lunge:pair:3850',
    'band-row:-:-',
    'floor-press:pair:3850',
    'curl:pair:1850',
    'triceps-extension:pair:1850',
    'russian-twist:single:5000', // the weight ball is a real single load
  ])
})

test("Kilian's gear: the explanations say what happened", () => {
  const days = generate(kilian())
  assert.deepEqual(day(days, 'A')[0]!.why, { key: 'program.why.closestBelow', params: { target: 8000, load: 7850 } })
  assert.deepEqual(day(days, 'A')[1]!.why, { key: 'program.why.bodyweight', params: {} })
  assert.deepEqual(day(days, 'A')[3]!.why, { key: 'program.why.band', params: {} })
  assert.deepEqual(day(days, 'B')[6]!.why, { key: 'program.why.exact', params: { load: 5000 } })
})

test("Kilian's gear with the handle not weighed (0 g): the plates alone give 8 / 4 / 2 kg", () => {
  const days = generate(kilian(0))
  assert.deepEqual(summary(day(days, 'A')), [
    'goblet-squat:single:8000',
    'push-up:-:-',
    'one-arm-row:single:8000',
    'band-pull-apart:-:-',
    'overhead-press:pair:4000',
    'plank:-:-',
  ])
  assert.deepEqual(summary(day(days, 'B')), [
    'romanian-deadlift:pair:4000',
    'reverse-lunge:pair:4000',
    'band-row:-:-',
    'floor-press:pair:4000',
    'curl:pair:2000',
    'triceps-extension:pair:2000',
    'russian-twist:single:5000',
  ])
})

// --- Missing gear ----------------------------------------------------------

test('no equipment at all: a full bodyweight program, each pick says why', () => {
  const days = generate(nothing)
  assert.deepEqual(summary(day(days, 'A')), [
    'bodyweight-squat:-:-',
    'push-up:-:-',
    'towel-row:-:-',
    'prone-y-t-raise:-:-',
    'pike-push-up:-:-',
    'plank:-:-',
  ])
  assert.deepEqual(summary(day(days, 'B')), [
    'glute-bridge:-:-',
    'bodyweight-reverse-lunge:-:-',
    'towel-row:-:-',
    'push-up:-:-',
    'towel-curl:-:-',
    'close-grip-push-up:-:-',
    'dead-bug:-:-',
  ])
  for (const d of days) for (const p of d.picks) assert.equal(p.loadGrams, null)
  assert.equal(day(days, 'A')[0]!.why.key, 'program.why.noLoad')
  assert.deepEqual(day(days, 'A')[0]!.why.params, { target: 8000 })
  assert.equal(day(days, 'A')[3]!.why.key, 'program.why.noBand')
  assert.equal(day(days, 'A')[1]!.why.key, 'program.why.bodyweight') // push-up needs nothing in the first place
})

test('overrides: a fallback uses its own target range, not the slot range', () => {
  const squat = day(generate(nothing), 'A')[0]!
  assert.equal(squat.slug, 'bodyweight-squat')
  assert.deepEqual([squat.targetMin, squat.targetMax], [12, 20])
  const goblet = day(generate(kilian()), 'A')[0]!
  assert.deepEqual([goblet.sets, goblet.targetMin, goblet.targetMax], [3, 10, 12])
})

test('no band: band exercises fall back, weights still work', () => {
  const days = generate({ ...kilian(), bands: [] })
  const a = day(days, 'A')
  assert.equal(a[3]!.slug, 'prone-y-t-raise')
  assert.equal(a[3]!.why.key, 'program.why.noBand')
  const bandRow = day(days, 'B')[2]!
  assert.equal(bandRow.slug, 'bent-over-row')
  assert.equal(bandRow.loadGrams, 3850) // closest at or below the 4 kg start
  assert.equal(bandRow.why.key, 'program.why.noBandLoad')
  assert.equal(a[0]!.loadGrams, 7850)
  // A band row of count 0 is not a band.
  assert.equal(day(generate({ ...kilian(), bands: [{ count: 0 }] }), 'A')[3]!.slug, 'prone-y-t-raise')
})

test('one handle: no pairs, so pair exercises use the next candidate; singles still work', () => {
  const days = generate({ ...kilian(), handles: { count: 1, grams: 1850 } })
  assert.equal(day(days, 'A')[0]!.loadGrams, 7850) // goblet squat: a single
  assert.equal(day(days, 'A')[4]!.slug, 'pike-push-up') // no pair -> bodyweight
  // Romanian deadlift: pair is out, the single 8 kg candidate takes over.
  const rdl = day(days, 'B')[0]!
  assert.deepEqual([rdl.slug, rdl.loadMode, rdl.loadGrams], ['romanian-deadlift', 'single', 7850])
  assert.equal(rdl.why.key, 'program.why.altLoad')
  assert.deepEqual(rdl.why.params, { target: 8000, load: 7850 })
})

test('only a weight ball: singles use it, pairs fall back to bodyweight', () => {
  const days = generate({ ...nothing, fixed: [{ grams: 5000, count: 1, label: 'Ball' }] })
  assert.deepEqual([day(days, 'A')[0]!.slug, day(days, 'A')[0]!.loadGrams], ['goblet-squat', 5000])
  assert.equal(day(days, 'A')[4]!.slug, 'pike-push-up')
  assert.equal(day(days, 'B')[6]!.loadGrams, 5000)
})

test('an empty handle (0 g) is not a load', () => {
  // Handles but no plates and unweighed: only a 0 g "load" exists. Must not be picked.
  const days = generate({ ...nothing, handles: { count: 2, grams: 0 } })
  for (const d of days) for (const p of d.picks) assert.equal(p.loadGrams, null)
})

// --- Load picking rules ----------------------------------------------------

const rules = { minUnderPercent: 50, maxOverPercent: 125 }

test('pickLoad: heaviest at or below, else the next one up within the limit, else nothing', () => {
  assert.deepEqual(pickLoad([2000, 4000, 6000], 4000, rules), { grams: 4000, relation: 'exact' })
  assert.deepEqual(pickLoad([2000, 4000, 6000], 5000, rules), { grams: 4000, relation: 'below' })
  assert.deepEqual(pickLoad([5000, 6000], 4000, rules), { grams: 5000, relation: 'above' }) // exactly 125%
  assert.equal(pickLoad([5001, 6000], 4000, rules), null) // just over 125%
  assert.equal(pickLoad([], 4000, rules), null)
})

test('pickLoad: too light does not count; the boundary at exactly 50% does', () => {
  assert.deepEqual(pickLoad([4000], 8000, rules), { grams: 4000, relation: 'below' }) // exactly 50%
  assert.equal(pickLoad([3999], 8000, rules), null) // just under
  // Too light, but a usable load above exists: take that one.
  assert.deepEqual(pickLoad([1850, 9000], 8000, rules), { grams: 9000, relation: 'above' })
  // Too light and the next one up is over the limit: nothing.
  assert.equal(pickLoad([1850, 12000], 8000, rules), null)
})

test('only 1850 g singles: bodyweight squat instead of a 1850 g "goblet squat"', () => {
  const days = generate({ ...nothing, handles: { count: 1, grams: 1850 } })
  const squat = day(days, 'A')[0]!
  assert.deepEqual([squat.slug, squat.loadGrams], ['bodyweight-squat', null])
  assert.equal(squat.why.key, 'program.why.noLoad')
  assert.equal(day(days, 'A')[2]!.slug, 'towel-row') // one-arm row is too light too, and one handle makes no pair
})

test('a load just over the limit is skipped for the next candidate', () => {
  // Only a 10 kg ball: 10000 is exactly 125% of the 8 kg start -> allowed.
  const ok = generate({ ...nothing, fixed: [{ grams: 10000, count: 1, label: 'Ball' }] })
  assert.equal(day(ok, 'A')[0]!.loadGrams, 10000)
  assert.equal(day(ok, 'A')[0]!.why.key, 'program.why.lightest')
  // A 10.5 kg ball is over -> bodyweight squat.
  const tooHeavy = generate({ ...nothing, fixed: [{ grams: 10500, count: 1, label: 'Ball' }] })
  assert.equal(day(tooHeavy, 'A')[0]!.slug, 'bodyweight-squat')
})

// --- Short version ---------------------------------------------------------

test('shortVersion: the first slots with capped sets, numbers from the template', () => {
  const a = generate(kilian()).find((d) => d.key === 'A')!
  const short = shortVersion(a, STARTER_PROGRAM.shortVersion)
  assert.equal(short.picks.length, STARTER_PROGRAM.shortVersion.maxSlots)
  assert.deepEqual(short.picks.map((p) => p.slug), a.picks.slice(0, 3).map((p) => p.slug))
  for (const p of short.picks) assert.ok(p.sets <= STARTER_PROGRAM.shortVersion.maxSets)
  assert.equal(a.picks[0]!.sets, 3) // the original is untouched
  assert.equal(shortVersion(a, { maxSlots: 99, maxSets: 99 }).picks.length, a.picks.length)
  // Generic over the pick shape, so the API can run it on stored rows (with ids).
  const rows = a.picks.map((p, i) => ({ id: `row${i}`, sets: p.sets }))
  assert.deepEqual(shortVersion({ key: 'A', picks: rows }, STARTER_PROGRAM.shortVersion).picks, [
    { id: 'row0', sets: 2 },
    { id: 'row1', sets: 2 },
    { id: 'row2', sets: 2 },
  ])
})

// --- Stored picks can be re-explained ---------------------------------------

test('explainStoredPick gives the same explanation the generator gave', () => {
  for (const equipment of [kilian(), kilian(0), nothing, { ...kilian(), bands: [] }, { ...kilian(), handles: { count: 1, grams: 1850 } }]) {
    for (const d of generate(equipment)) {
      d.picks.forEach((p, order) => {
        const again = explainStoredPick(STARTER_PROGRAM, EXERCISES, { dayKey: d.key, order, slug: p.slug, loadGrams: p.loadGrams, loadMode: p.loadMode })
        assert.deepEqual(again, p.why)
      })
    }
  }
  const unknown = explainStoredPick(STARTER_PROGRAM, EXERCISES, { dayKey: 'A', order: 0, slug: 'nope', loadGrams: null, loadMode: null })
  assert.equal(unknown.key, 'program.why.custom')
})

// --- Property test ---------------------------------------------------------

// Small seeded PRNG so a failure is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomEquipment(rand: () => number): ProgramEquipment {
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  const weights = [250, 500, 750, 1000, 1250, 2000, 2500, 5000, 10000]
  const plates: ProgramEquipment['plates'] = []
  let total = 0
  for (let i = int(0, 5); i > 0; i--) {
    const count = Math.min(int(0, 8), 14 - total) // keeps buildableLoads quick
    if (count <= 0) break
    total += count
    plates.push({ grams: weights[int(0, weights.length - 1)]!, count })
  }
  return {
    handles: { count: int(0, 4), grams: rand() < 0.3 ? 0 : int(0, 40) * 250 },
    plates,
    fixed: Array.from({ length: int(0, 3) }, (_, i) => ({ grams: int(1, 40) * 500, count: int(0, 3), label: `Fixed ${i}` })),
    bands: Array.from({ length: int(0, 2) }, () => ({ count: int(0, 3) })),
  }
}

test('property: 300 random setups, every load is buildable and every day is complete', () => {
  const rand = mulberry32(20261011)
  const { minUnderPercent, maxOverPercent } = STARTER_PROGRAM.loadRules
  for (let n = 0; n < 300; n++) {
    const equipment = randomEquipment(rand)
    const options = buildableLoads(equipment)
    const days = generate(equipment)

    assert.equal(days.length, STARTER_PROGRAM.days.length)
    days.forEach((d, i) => {
      const template = STARTER_PROGRAM.days[i]!
      assert.equal(d.key, template.key)
      assert.equal(d.picks.length, template.slots.length, `day ${d.key} lost a slot`)
      d.picks.forEach((p, order) => {
        const context = `${d.key}#${order} ${p.slug} for ${JSON.stringify(equipment)}`
        // The pick is one of the slot's own candidates.
        const candidate = template.slots[order]!.candidates.find((c) => c.slug === p.slug && (c.load?.mode ?? null) === p.loadMode)
        assert.ok(candidate, `not a candidate: ${context}`)
        if (p.loadGrams === null) {
          assert.equal(p.loadMode, null, context)
          assert.ok(!candidate.load, context)
        } else {
          assert.ok(p.loadMode, context)
          assert.ok(Number.isInteger(p.loadGrams) && p.loadGrams > 0, context)
          assert.ok(loadSteps(options, p.loadMode).includes(p.loadGrams), `load not buildable: ${context}`)
          const start = candidate.load!.startGrams
          if (p.loadGrams <= start) assert.ok(p.loadGrams * 100 >= start * minUnderPercent, `too light: ${context}`)
          else assert.ok(p.loadGrams * 100 <= start * maxOverPercent, `too heavy: ${context}`)
        }
        // A band exercise needs a band.
        if (EXERCISES.find((e) => e.slug === p.slug)!.loadType === 'band') {
          assert.ok(equipment.bands.some((b) => b.count >= 1), `band without a band: ${context}`)
        }
        // Always explained, with whole-gram numeric params and a message that exists.
        assert.match(p.why.key, /^program\.why\.[a-zA-Z]+$/)
        assert.ok((en.program.why as Record<string, string>)[p.why.key.slice('program.why.'.length)], `no text: ${p.why.key}`)
        for (const value of Object.values(p.why.params)) assert.ok(Number.isInteger(value), context)
        assert.ok(p.sets > 0 && p.targetMin > 0 && p.targetMax >= p.targetMin, context)
      })
    })
  }
})

// --- The data itself -------------------------------------------------------

test('catalog: unique slugs, valid ladders, a name and a cue in en.json for every exercise', () => {
  const slugs = EXERCISES.map((e) => e.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  const used = new Set<string>()
  for (const ladder of EXERCISE_LADDERS) {
    for (const slug of ladder) {
      assert.ok(slugs.includes(slug), `ladder has unknown exercise ${slug}`)
      assert.ok(!used.has(slug), `${slug} is in two ladders`)
      used.add(slug)
    }
  }
  const messages = en.exercises as Record<string, { name: string; cue: string }>
  for (const slug of slugs) {
    const key = exerciseKey(slug, 'name').split('.')[1]!
    assert.ok(messages[key]?.name, `no name for ${slug}`)
    assert.ok(messages[key]?.cue, `no cue for ${slug}`)
    assert.equal(exerciseKey(slug, 'cue'), `exercises.${key}.cue`)
  }
  assert.deepEqual(Object.keys(messages).sort(), slugs.map((s) => exerciseKey(s, 'name').split('.')[1]!).sort())
})

test('template: slugs exist, weighted candidates match the catalog, every slot ends without gear', () => {
  for (const d of STARTER_PROGRAM.days) {
    assert.ok(d.slots.length > 0)
    for (const slot of d.slots) {
      assert.ok(slot.sets > 0 && slot.targetMin > 0 && slot.targetMax >= slot.targetMin)
      for (const c of slot.candidates) {
        const entry = EXERCISES.find((e) => e.slug === c.slug)
        assert.ok(entry, `unknown exercise ${c.slug}`)
        const weighted = entry.loadType === 'single' || entry.loadType === 'pair'
        assert.equal(!!c.load, weighted, `${c.slug}: load config does not match loadType ${entry.loadType}`)
        if (c.load) assert.ok(Number.isInteger(c.load.startGrams) && c.load.startGrams > 0)
      }
      const last = slot.candidates.at(-1)!
      assert.equal(EXERCISES.find((e) => e.slug === last.slug)!.loadType, 'bodyweight', `${d.key}: last candidate needs gear`)
    }
  }
  assert.ok(STARTER_PROGRAM.shortVersion.maxSlots > 0 && STARTER_PROGRAM.shortVersion.maxSets > 0)
})
