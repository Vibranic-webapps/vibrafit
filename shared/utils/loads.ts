// Load calculator: every weight the user can actually build from the gear they own.
//
// Non-negotiable #1: the app never suggests a load that can't be built. So this
// is the only place loads come from; the progression engine picks from its output.
// Pure and dependency-free (shared by client and server, tested with `npm test`).
//
// All weights are integer GRAMS (non-negotiable #2).
//
// Rules:
// - A dumbbell is a handle plus plates, and must be SYMMETRIC: both sides carry
//   the same plates. So plates are only usable in pairs of equal weight; an odd
//   plate left over can't go on a dumbbell.
// - "pair" = two dumbbells (one per hand) at the same load. Both are built from
//   the same pile of plates, so they can't share a plate.
// - "single" = one dumbbell (goblet squat, one-arm row), so it may use every pair.
// - Fixed weights (a 5 kg ball, a kettlebell) can't be changed: one of them is a
//   "single" option, two identical ones are also a "pair" option.

export interface Equipment {
  /** Adjustable dumbbell handles. Empty handle weight in grams (0 if unknown). */
  handles: { count: number; grams: number }
  /** Loose plates: weight of one plate + how many of that weight. */
  plates: { grams: number; count: number }[]
  /** Fixed-weight implements, e.g. a 5 kg medicine ball. */
  fixed: { grams: number; count: number; label: string }[]
}

export type LoadMode = 'single' | 'pair'

/** Plates on ONE side of ONE dumbbell, heaviest first. The other side mirrors it. */
export type SidePlates = number[]

export interface LoadOption {
  mode: LoadMode
  /** Load in ONE hand / of ONE implement, in grams. */
  grams: number
  /** How to build it. Dumbbell: one entry (single) or two (pair). Fixed: none. */
  kind: 'dumbbell' | 'fixed'
  dumbbells: SidePlates[]
  /** Fixed implement label, e.g. "Weight ball". */
  label?: string
}

function assertGrams(value: number, what: string, allowZero = true): void {
  if (!Number.isInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new RangeError(`${what} must be a whole, non-negative number of grams (got ${value})`)
  }
}

function assertCount(value: number, what: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${what} must be a whole, non-negative count (got ${value})`)
  }
}

/** Plate pairs available per weight, heaviest first. Same weights listed twice are merged. */
function platePairs(plates: Equipment['plates']): { grams: number; pairs: number }[] {
  const byWeight = new Map<number, number>()
  for (const p of plates) {
    assertGrams(p.grams, 'Plate weight', false)
    assertCount(p.count, 'Plate count')
    byWeight.set(p.grams, (byWeight.get(p.grams) ?? 0) + p.count)
  }
  return [...byWeight]
    .map(([grams, count]) => ({ grams, pairs: Math.floor(count / 2) }))
    .filter((p) => p.pairs > 0)
    .sort((a, b) => b.grams - a.grams)
}

function sidePlates(types: { grams: number }[], counts: number[]): SidePlates {
  return types.flatMap((t, i) => Array<number>(counts[i] ?? 0).fill(t.grams))
}

/** A partial build while walking the plate types: pairs used per type so far. */
interface Build {
  counts: number[]
  plates: number
}

/**
 * Dynamic programming over plate types instead of trying every combination
 * (that blows up exponentially: 48 plates took ~2 s). For every reachable
 * side weight we keep only the build with the fewest plates (quicker to
 * change mid-workout); on a tie the first one found wins, so results are stable.
 */
function singleSides(types: { grams: number; pairs: number }[]): Map<number, Build> {
  let states = new Map<number, Build>([[0, { counts: [], plates: 0 }]])
  for (const type of types) {
    const next = new Map<number, Build>()
    for (const [side, build] of states) {
      for (let n = 0; n <= type.pairs; n++) {
        const key = side + n * type.grams
        const candidate = { counts: [...build.counts, n], plates: build.plates + n }
        const current = next.get(key)
        if (!current || candidate.plates < current.plates) next.set(key, candidate)
      }
    }
    states = next
  }
  return states
}

/**
 * Two dumbbells from one pile: split each plate type's pairs between dumbbell
 * A and B, and keep the splits where both sides weigh the same. States are
 * keyed by (side A, side B) with A >= B (swapping the two dumbbells changes
 * nothing), and a state is dropped once the plates left can't even it out.
 */
function pairSides(types: { grams: number; pairs: number }[]): Map<number, [Build, Build]> {
  let remaining = types.reduce((sum, t) => sum + t.pairs * t.grams, 0)
  let states = new Map<string, { a: number; b: number; builds: [Build, Build] }>([
    ['0|0', { a: 0, b: 0, builds: [{ counts: [], plates: 0 }, { counts: [], plates: 0 }] }],
  ])
  for (const type of types) {
    remaining -= type.pairs * type.grams
    const next = new Map<string, { a: number; b: number; builds: [Build, Build] }>()
    for (const { a, b, builds } of states.values()) {
      for (let na = 0; na <= type.pairs; na++) {
        for (let nb = 0; na + nb <= type.pairs; nb++) {
          let sideA = a + na * type.grams
          let sideB = b + nb * type.grams
          let buildA: Build = { counts: [...builds[0].counts, na], plates: builds[0].plates + na }
          let buildB: Build = { counts: [...builds[1].counts, nb], plates: builds[1].plates + nb }
          if (sideA < sideB) {
            ;[sideA, sideB] = [sideB, sideA]
            ;[buildA, buildB] = [buildB, buildA]
          }
          if (sideA - sideB > remaining) continue // can never balance
          const key = `${sideA}|${sideB}`
          const current = next.get(key)
          if (!current || buildA.plates + buildB.plates < current.builds[0].plates + current.builds[1].plates) {
            next.set(key, { a: sideA, b: sideB, builds: [buildA, buildB] })
          }
        }
      }
    }
    states = next
  }
  const balanced = new Map<number, [Build, Build]>()
  for (const { a, b, builds } of states.values()) if (a === b) balanced.set(a, builds)
  return balanced
}

function dumbbellOptions(equipment: Equipment): LoadOption[] {
  const { count, grams: handleGrams } = equipment.handles
  assertCount(count, 'Handle count')
  assertGrams(handleGrams, 'Handle weight')
  if (count === 0) return []

  const types = platePairs(equipment.plates)
  const load = (side: number) => handleGrams + 2 * side

  const options: LoadOption[] = [...singleSides(types)].map(([side, build]) => ({
    mode: 'single',
    grams: load(side),
    kind: 'dumbbell',
    dumbbells: [sidePlates(types, build.counts)],
  }))

  if (count >= 2) {
    for (const [side, [a, b]] of pairSides(types)) {
      options.push({
        mode: 'pair',
        grams: load(side),
        kind: 'dumbbell',
        dumbbells: [sidePlates(types, a.counts), sidePlates(types, b.counts)],
      })
    }
  }

  return options
}

function fixedOptions(fixed: Equipment['fixed']): LoadOption[] {
  const options: LoadOption[] = []
  for (const f of fixed) {
    assertGrams(f.grams, 'Fixed weight', false)
    assertCount(f.count, 'Fixed weight count')
    if (f.count >= 1) options.push({ mode: 'single', grams: f.grams, kind: 'fixed', dumbbells: [], label: f.label })
    if (f.count >= 2) options.push({ mode: 'pair', grams: f.grams, kind: 'fixed', dumbbells: [], label: f.label })
  }
  return options
}

/**
 * Every buildable load, lightest first (single before pair at the same weight).
 * A load reachable both with plates and with a fixed weight appears once per
 * kind, so the UI can say "8 kg dumbbell" or "8 kg kettlebell".
 */
export function buildableLoads(equipment: Equipment): LoadOption[] {
  return [...dumbbellOptions(equipment), ...fixedOptions(equipment.fixed)].sort(
    (a, b) => a.grams - b.grams || (a.mode === b.mode ? 0 : a.mode === 'single' ? -1 : 1) || a.kind.localeCompare(b.kind),
  )
}

/** Distinct loads for one mode, lightest first. */
export function loadSteps(options: LoadOption[], mode: LoadMode): number[] {
  return [...new Set(options.filter((o) => o.mode === mode).map((o) => o.grams))].sort((a, b) => a - b)
}

/**
 * The next heavier load the user can build in this mode, or null when they're
 * already at the heaviest (the progression engine then switches to a harder
 * variation instead of inventing a weight).
 */
export function nextLoadUp(options: LoadOption[], mode: LoadMode, currentGrams: number): number | null {
  return loadSteps(options, mode).find((g) => g > currentGrams) ?? null
}

/** The next lighter load (for a step back / deload), or null at the lightest. */
export function nextLoadDown(options: LoadOption[], mode: LoadMode, currentGrams: number): number | null {
  return loadSteps(options, mode).findLast((g) => g < currentGrams) ?? null
}
