/**
 * Turns exercise data into the sentences the screens show. All wording lives
 * in i18n; this only picks the right key and fills in numbers. Weights arrive
 * in integer grams and are converted to kg here, at the edge.
 */
import type { DraftExercise } from '~/utils/workoutDraft'

/** The fields of an exercise these helpers need (program rows and draft rows both fit). */
export type ExerciseLike = Pick<
  DraftExercise,
  'nameKey' | 'slug' | 'measure' | 'perSide' | 'loadType' | 'loadGrams' | 'targetMin' | 'targetMax' | 'sets' | 'why' | 'cueKey'
>

export function useWorkoutText() {
  const { t, te } = useI18n()

  /** "10-12", or "15" when min equals max. */
  function range(ex: Pick<ExerciseLike, 'targetMin' | 'targetMax'>): string {
    return ex.targetMin === ex.targetMax ? String(ex.targetMin) : `${ex.targetMin}–${ex.targetMax}`
  }

  function name(ex: Pick<ExerciseLike, 'nameKey' | 'slug'>): string {
    return ex.nameKey && te(ex.nameKey) ? t(ex.nameKey) : ex.slug
  }

  function cue(ex: Pick<ExerciseLike, 'cueKey'>): string {
    return ex.cueKey && te(ex.cueKey) ? t(ex.cueKey) : ''
  }

  /** "7.85 kg", "2 x 3.85 kg" (a pair), "Band", "Bodyweight". */
  function load(ex: Pick<ExerciseLike, 'loadType' | 'loadGrams'>): string {
    if (ex.loadType === 'band') return t('workout.loadBand')
    if (ex.loadGrams === null) return t('workout.loadBodyweight')
    const kg = t('equipment.loads.kg', { kg: gramsToKg(ex.loadGrams) })
    return ex.loadType === 'pair' ? `2 × ${kg}` : kg
  }

  /** The "Aim for ..." line (the target and the load). */
  function aim(ex: ExerciseLike): string {
    const r = range(ex)
    if (ex.measure === 'seconds') return t('workout.aimSeconds', { range: r })
    if (ex.loadType === 'band') return t('workout.aimBand', { range: r })
    if (ex.loadGrams === null) return t(ex.perSide ? 'workout.aimPerSideBodyweight' : 'workout.aimReps', { range: r })
    return t(ex.perSide ? 'workout.aimPerSide' : 'workout.aimLoad', { range: r, load: load(ex) })
  }

  /**
   * Why the program picked this load (non-negotiable #4: explainable).
   * `why.params` are grams: converted to kg before they reach the sentence.
   */
  function why(ex: Pick<ExerciseLike, 'why'>): string {
    // Pure noise mid-workout: "just your bodyweight" or "regenerate your program".
    if (ex.why.key === 'program.why.bodyweight' || ex.why.key === 'program.why.custom') return ''
    const params: Record<string, string> = {}
    for (const [key, value] of Object.entries(ex.why.params)) params[key] = gramsToKg(value)
    return te(ex.why.key) ? t(ex.why.key, params) : ''
  }

  /** "3 x 10-12", "3 x 10-12 per side", "3 x 20-40 s". */
  function detail(ex: ExerciseLike): string {
    const key = ex.measure === 'seconds' ? 'today.rowDetailSeconds' : ex.perSide ? 'today.rowDetailPerSide' : 'today.rowDetail'
    return t(key, { sets: ex.sets, range: range(ex) })
  }

  /** "1 minute 30 seconds", for screen readers. */
  function spokenTime(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds))
    const minutes = Math.floor(s / 60)
    const seconds = s % 60
    const parts: string[] = []
    if (minutes > 0) parts.push(t('workout.spoken.minutes', { n: minutes }, minutes))
    if (seconds > 0 || minutes === 0) parts.push(t('workout.spoken.seconds', { n: seconds }, seconds))
    return parts.join(' ')
  }

  return { range, name, cue, load, aim, why, detail, spokenTime }
}
