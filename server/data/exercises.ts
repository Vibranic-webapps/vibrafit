// Exercise catalog: the global list every user's program is built from.
// DATA, not logic (project rule #3): add or change an exercise here, run
// `npm run db:seed`, and add its two strings to i18n/locales/en.json.
// Nothing in here is user-owned (see the note on Exercise in schema.prisma).
//
// loadType says how the exercise is NORMALLY loaded. A program candidate may
// use a different mode (Romanian deadlift: a pair of dumbbells, or one heavy
// one); the mode that was picked is stored on the ProgramExercise row.

export type ExerciseLoadType = 'single' | 'pair' | 'band' | 'bodyweight'
export type ExerciseMeasure = 'reps' | 'seconds'

export interface ExerciseSeed {
  /** Stable id, used by the seed, the program template and the ladders below. */
  slug: string
  loadType: ExerciseLoadType
  measure: ExerciseMeasure
  /** "10 / side": the amount is per side (one-arm row, lunge, twist). */
  perSide: boolean
}

const ex = (
  slug: string,
  loadType: ExerciseLoadType,
  options: { measure?: ExerciseMeasure; perSide?: boolean } = {},
): ExerciseSeed => ({ slug, loadType, measure: options.measure ?? 'reps', perSide: options.perSide ?? false })

export const EXERCISES: readonly ExerciseSeed[] = [
  // Squat
  ex('bodyweight-squat', 'bodyweight'),
  ex('goblet-squat', 'single'),
  ex('split-squat', 'single', { perSide: true }),
  ex('bulgarian-split-squat', 'single', { perSide: true }),
  // Push
  ex('incline-push-up', 'bodyweight'),
  ex('knee-push-up', 'bodyweight'),
  ex('push-up', 'bodyweight'),
  ex('decline-push-up', 'bodyweight'),
  ex('close-grip-push-up', 'bodyweight'),
  ex('pike-push-up', 'bodyweight'),
  ex('overhead-press', 'pair'),
  ex('floor-press', 'pair'),
  // Pull
  ex('one-arm-row', 'single', { perSide: true }),
  ex('bent-over-row', 'pair'),
  ex('towel-row', 'bodyweight'),
  ex('band-row', 'band'),
  ex('band-pull-apart', 'band'),
  ex('prone-y-t-raise', 'bodyweight'),
  // Hinge and lunge
  ex('romanian-deadlift', 'pair'),
  ex('glute-bridge', 'bodyweight'),
  ex('single-leg-rdl', 'single', { perSide: true }),
  ex('reverse-lunge', 'pair', { perSide: true }),
  ex('bodyweight-reverse-lunge', 'bodyweight', { perSide: true }),
  // Arms
  ex('curl', 'pair'),
  ex('towel-curl', 'bodyweight'),
  ex('triceps-extension', 'pair'),
  // Core
  ex('plank', 'bodyweight', { measure: 'seconds' }),
  ex('russian-twist', 'single', { perSide: true }),
  ex('dead-bug', 'bodyweight', { perSide: true }),
]

// Progression ladders, easiest first. The seed links neighbours as
// easier/harder; the Phase 2 engine moves along them when a load can't go up
// (or when reps stay under the range). Order inside a chain is a judgement call.
export const EXERCISE_LADDERS: readonly (readonly string[])[] = [
  ['bodyweight-squat', 'goblet-squat', 'split-squat', 'bulgarian-split-squat'],
  ['incline-push-up', 'knee-push-up', 'push-up', 'decline-push-up'],
  ['glute-bridge', 'romanian-deadlift', 'single-leg-rdl'],
  ['bodyweight-reverse-lunge', 'reverse-lunge'],
  ['prone-y-t-raise', 'band-pull-apart'],
  ['towel-curl', 'curl'],
]

function camel(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/**
 * i18n key of an exercise's display name or safety cue. camelCase on purpose:
 * `exercises.gobletSquat.name`. Hyphens in a message path are a trap in vue-i18n.
 */
export function exerciseKey(slug: string, part: 'name' | 'cue'): string {
  return `exercises.${camel(slug)}.${part}`
}
