import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { getEquipment } from './equipment'
import { apiError } from './errors'
import { explainStoredPick, generateProgram, shortVersion, type Why } from './program'
import { EXERCISES, exerciseKey } from '../data/exercises'
import { STARTER_PROGRAM } from '../data/program'

// Program storage: read the user's program, or (re)generate it from their gear.
// The rules live in server/utils/program.ts and the data in server/data/*;
// this file is only the database side.

/** One exercise in a day. Shape of GET /api/program (grams, never kg). */
export interface ProgramExerciseDto {
  id: string
  order: number
  slug: string
  nameKey: string
  cueKey: string
  measure: 'reps' | 'seconds'
  perSide: boolean
  loadType: 'single' | 'pair' | 'band' | 'bodyweight'
  sets: number
  targetMin: number
  targetMax: number
  loadGrams: number | null
  loadMode: 'single' | 'pair' | null
  why: Why
}

export interface ProgramDto {
  days: {
    key: string
    exercises: ProgramExerciseDto[]
    /** The 10-minute version of this day: which exercises, with how many sets (rule: STARTER_PROGRAM.shortVersion). */
    short: { id: string; sets: number }[]
  }[]
}

export async function getProgram(userId: string): Promise<ProgramDto> {
  const days = await prisma.programDay.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  })
  return {
    days: days.map((day) => {
      const exercises: ProgramExerciseDto[] = day.exercises.map((row) => ({
        id: row.id,
        order: row.order,
        slug: row.exercise.slug,
        nameKey: row.exercise.nameKey,
        cueKey: exerciseKey(row.exercise.slug, 'cue'),
        measure: row.exercise.measure,
        perSide: row.exercise.perSide,
        loadType: row.exercise.loadType,
        sets: row.sets,
        targetMin: row.targetMin,
        targetMax: row.targetMax,
        loadGrams: row.loadGrams,
        loadMode: row.loadMode,
        why: explainStoredPick(STARTER_PROGRAM, EXERCISES, {
          dayKey: day.key,
          order: row.order,
          slug: row.exercise.slug,
          loadGrams: row.loadGrams,
          loadMode: row.loadMode,
        }),
      }))
      const short = shortVersion({ key: day.key, picks: exercises }, STARTER_PROGRAM.shortVersion)
      return { key: day.key, exercises, short: short.picks.map((p) => ({ id: p.id, sets: p.sets })) }
    }),
  }
}

async function writeProgram(userId: string): Promise<void> {
  const equipment = await getEquipment(userId)
  const generated = generateProgram(STARTER_PROGRAM, equipment, EXERCISES)

  const slugs = [...new Set(generated.flatMap((day) => day.picks.map((p) => p.slug)))]
  const rows = await prisma.exercise.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]))
  if (slugs.some((slug) => !idBySlug.has(slug))) {
    // The catalog is seeded by `npm run db:seed` (after db:deploy). Not a user error.
    console.error('Exercise catalog is missing rows. Run `npm run db:seed`.')
    apiError(500, 'catalog_missing')
  }

  // Replace the whole program in one transaction: either the old one or the
  // new one exists, never a half-written one. Workout history survives
  // (WorkoutSession.programDayId is SetNull).
  await prisma.$transaction(async (tx) => {
    await tx.programDay.deleteMany({ where: { userId } })
    for (const [dayIndex, day] of generated.entries()) {
      await tx.programDay.create({
        data: {
          userId,
          key: day.key,
          order: dayIndex,
          exercises: {
            create: day.picks.map((pick, order) => ({
              exerciseId: idBySlug.get(pick.slug)!,
              order, // position in the template, which explainStoredPick relies on
              sets: pick.sets,
              targetMin: pick.targetMin,
              targetMax: pick.targetMax,
              loadGrams: pick.loadGrams,
              loadMode: pick.loadMode,
            })),
          },
        },
      })
    }
  })
}

/** Rebuild the user's program from their current equipment; returns the same shape as getProgram. */
export async function regenerateProgram(userId: string): Promise<ProgramDto> {
  try {
    await writeProgram(userId)
  } catch (error) {
    // Two generates at once can both try to create day "A"; the loser hits the
    // unique key. Retrying once is safe: it is a full replace.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      await writeProgram(userId)
    } else {
      throw error
    }
  }
  return getProgram(userId)
}
