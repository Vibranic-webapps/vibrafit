// Program generator: template + the user's gear -> a concrete A/B program.
// PURE (no database, no framework), unit-tested in tests/program.test.ts.
//
// Rules this file keeps (project CLAUDE.md):
//  #1 every load comes from buildableLoads(); nothing is ever invented.
//  #2 loads are integer grams.
//  #3 the program itself (exercises, targets, start loads, rule numbers) is
//     DATA in server/data/program.ts; this file only applies it.
//  #4 every pick carries a `why` (an i18n key + params) saying why it was chosen.
//
// Relative imports with .ts on purpose: `npm test` runs this file in plain Node.

import { buildableLoads, loadSteps } from '../../shared/utils/loads.ts'
import type { Equipment, LoadMode } from '../../shared/utils/loads.ts'

// --- Template (the shape of server/data/program.ts) ------------------------

export interface Candidate {
  /** Exercise slug in the catalog. */
  slug: string
  /** Present for weighted exercises: the mode and the preferred starting load (grams, per hand). */
  load?: { mode: LoadMode; startGrams: number }
  /** Overrides of the slot's sets / targets, for fallbacks with a different natural range. */
  sets?: number
  targetMin?: number
  targetMax?: number
}

export interface Slot {
  sets: number
  targetMin: number // reps or seconds, per the exercise's measure
  targetMax: number
  /** Tried in order; the first one the gear supports wins. The last one must need no gear. */
  candidates: Candidate[]
}

export interface DayTemplate {
  key: string // "A" / "B"
  slots: Slot[]
}

export interface ProgramTemplate {
  days: DayTemplate[]
  loadRules: {
    /** The heaviest load at or below the start only counts when it is at least this % of the start. */
    minUnderPercent: number
    /** Otherwise the next load above the start counts when it is at most this % of the start. */
    maxOverPercent: number
  }
  /** The 10-minute version: first `maxSlots` slots, at most `maxSets` sets each. */
  shortVersion: { maxSlots: number; maxSets: number }
}

/** What the generator needs to know about an exercise (ExerciseSeed satisfies this). */
export interface CatalogEntry {
  slug: string
  loadType: 'single' | 'pair' | 'band' | 'bodyweight'
}

/** Gear the generator reads: the load calculator's input plus the bands the user owns (a band is a closed loop; its resistance label is text and never used as a load). */
export type ProgramEquipment = Equipment & { bands: { label?: string; resistance?: string | null; count: number }[] }

// --- Output ----------------------------------------------------------------

/** An explanation as data: the client renders `key` with `params` (grams, not kg). */
export interface Why {
  key: string
  params: Record<string, number>
}

export interface ProgramPick {
  slug: string
  sets: number
  targetMin: number
  targetMax: number
  /** Load in ONE hand / implement; null for bodyweight and bands. */
  loadGrams: number | null
  loadMode: LoadMode | null
  why: Why
}

export interface GeneratedDay {
  key: string
  picks: ProgramPick[]
}

// --- Helpers ---------------------------------------------------------------

type Kind = 'loaded' | 'band' | 'bodyweight'

function kindOf(candidate: Candidate, catalog: readonly CatalogEntry[]): Kind {
  const entry = catalog.find((e) => e.slug === candidate.slug)
  if (!entry) throw new Error(`Program template uses unknown exercise "${candidate.slug}"`)
  const weighted = entry.loadType === 'single' || entry.loadType === 'pair'
  if (weighted !== !!candidate.load) {
    throw new Error(`Exercise "${candidate.slug}" is ${entry.loadType}: its candidate ${weighted ? 'needs' : 'must not have'} a load`)
  }
  if (weighted) return 'loaded'
  return entry.loadType === 'band' ? 'band' : 'bodyweight'
}

type LoadRelation = 'exact' | 'below' | 'above'

/**
 * Conservative pick from the real steps (lightest first):
 *  1. the heaviest at or below the start, if it is at least `minUnderPercent` of it;
 *  2. else the lightest ABOVE the start, if it is at most `maxOverPercent` of it;
 *  3. else nothing (the slot tries its next candidate).
 * Integer maths only (rule #2).
 */
export function pickLoad(
  steps: readonly number[],
  startGrams: number,
  rules: ProgramTemplate['loadRules'],
): { grams: number; relation: LoadRelation } | null {
  const below = steps.findLast((g) => g <= startGrams)
  if (below !== undefined && below * 100 >= startGrams * rules.minUnderPercent) {
    return { grams: below, relation: below === startGrams ? 'exact' : 'below' }
  }
  const above = steps.find((g) => g > startGrams)
  if (above !== undefined && above * 100 <= startGrams * rules.maxOverPercent) return { grams: above, relation: 'above' }
  return null
}

/**
 * Why candidate `index` of a slot is what the user gets. Derived from the
 * template alone (plus the load), so GET /api/program can re-explain a stored
 * program without storing the sentence. Every candidate before `index` was
 * skipped when the program was generated, which is what the keys say.
 */
export function explainPick(
  slot: Slot,
  index: number,
  loadGrams: number | null,
  catalog: readonly CatalogEntry[],
): Why {
  const candidate = slot.candidates[index]
  if (!candidate) return { key: 'program.why.custom', params: {} }
  const kind = kindOf(candidate, catalog)
  const previous = index > 0 ? slot.candidates[index - 1] : undefined
  const previousKind = previous ? kindOf(previous, catalog) : null

  if (kind === 'band') return { key: 'program.why.band', params: {} }

  if (kind === 'bodyweight') {
    if (previousKind === null) return { key: 'program.why.bodyweight', params: {} }
    if (previousKind === 'band') return { key: 'program.why.noBand', params: {} }
    return { key: 'program.why.noLoad', params: { target: previous?.load?.startGrams ?? 0 } }
  }

  const target = candidate.load?.startGrams ?? 0
  const load = loadGrams ?? 0
  if (previousKind === null) {
    if (load === target) return { key: 'program.why.exact', params: { load } }
    return { key: load < target ? 'program.why.closestBelow' : 'program.why.lightest', params: { target, load } }
  }
  return { key: previousKind === 'band' ? 'program.why.noBandLoad' : 'program.why.altLoad', params: { target, load } }
}

// --- The generator ---------------------------------------------------------

/**
 * One concrete program for this gear. For every slot the first candidate the
 * gear supports wins:
 *  - bodyweight: always works
 *  - band: needs at least one band
 *  - weighted: needs a buildable load near the start (see pickLoad); a load of
 *    0 g (empty handles) is not a load, so it never counts
 */
export function generateProgram(
  template: ProgramTemplate,
  equipment: ProgramEquipment,
  catalog: readonly CatalogEntry[],
): GeneratedDay[] {
  const options = buildableLoads(equipment) // once; every load below comes from here
  const steps: Record<LoadMode, number[]> = {
    single: loadSteps(options, 'single').filter((g) => g > 0),
    pair: loadSteps(options, 'pair').filter((g) => g > 0),
  }
  const hasBand = equipment.bands.some((b) => b.count >= 1)

  return template.days.map((day) => ({
    key: day.key,
    picks: day.slots.map((slot, slotIndex) => {
      for (const [index, candidate] of slot.candidates.entries()) {
        const kind = kindOf(candidate, catalog)
        let loadGrams: number | null = null
        let loadMode: LoadMode | null = null

        if (kind === 'band' && !hasBand) continue
        if (kind === 'loaded' && candidate.load) {
          const chosen = pickLoad(steps[candidate.load.mode], candidate.load.startGrams, template.loadRules)
          if (!chosen) continue
          loadGrams = chosen.grams
          loadMode = candidate.load.mode
        }

        return {
          slug: candidate.slug,
          sets: candidate.sets ?? slot.sets,
          targetMin: candidate.targetMin ?? slot.targetMin,
          targetMax: candidate.targetMax ?? slot.targetMax,
          loadGrams,
          loadMode,
          why: explainPick(slot, index, loadGrams, catalog),
        }
      }
      // A template bug, not a user problem: the last candidate must be bodyweight.
      throw new Error(`Day ${day.key}, slot ${slotIndex + 1}: no candidate works without equipment`)
    }),
  }))
}

/**
 * Re-explain a STORED pick (a ProgramExercise row): find its slot by day key +
 * position and its candidate by slug (+ mode). A row the current template no
 * longer knows gets a generic "regenerate" explanation instead of a guess.
 */
export function explainStoredPick(
  template: ProgramTemplate,
  catalog: readonly CatalogEntry[],
  stored: { dayKey: string; order: number; slug: string; loadGrams: number | null; loadMode: LoadMode | null },
): Why {
  const slot = template.days.find((d) => d.key === stored.dayKey)?.slots[stored.order]
  const index = slot?.candidates.findIndex((c) => c.slug === stored.slug && (c.load?.mode ?? null) === stored.loadMode) ?? -1
  if (!slot || index < 0) return { key: 'program.why.custom', params: {} }
  return explainPick(slot, index, stored.loadGrams, catalog)
}

/** The "low energy" version of a day: first slots only, fewer sets (numbers live in the template). */
export function shortVersion<P extends { sets: number }>(
  day: { key: string; picks: P[] },
  rules: ProgramTemplate['shortVersion'],
): { key: string; picks: P[] } {
  return {
    key: day.key,
    picks: day.picks.slice(0, rules.maxSlots).map((p) => ({ ...p, sets: Math.min(p.sets, rules.maxSets) })),
  }
}
