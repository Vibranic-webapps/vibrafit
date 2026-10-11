// Seeds the global exercise catalog (server/data/exercises.ts).
// Run: npm run db:seed   (safe to run any number of times)
//
// Idempotent: rows are upserted by slug, then the easier/harder links are set
// from the ladders. Ladder links are written for EVERY catalog exercise
// (null when it has none), so removing a link from the data removes it here.
// It never deletes: an exercise that is no longer in the catalog stays, because
// logged sets may reference it.
//
// Production: run this once after `npm run db:deploy` (and whenever the
// catalog changes). Kilian runs prod; the seed has no prod special-casing.

import pkg from '@prisma/client'
import { EXERCISES, EXERCISE_LADDERS, exerciseKey } from '../server/data/exercises.ts'

const prisma = new pkg.PrismaClient()

async function main() {
  // Pass 1: the rows.
  for (const e of EXERCISES) {
    const data = { nameKey: exerciseKey(e.slug, 'name'), loadType: e.loadType, measure: e.measure, perSide: e.perSide }
    await prisma.exercise.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data })
  }

  // Pass 2: the links (needs every row to exist first).
  const rows = await prisma.exercise.findMany({ where: { slug: { in: EXERCISES.map((e) => e.slug) } }, select: { id: true, slug: true } })
  const idOf = new Map(rows.map((r) => [r.slug, r.id]))
  const easierOf = new Map<string, string>()
  const harderOf = new Map<string, string>()
  for (const ladder of EXERCISE_LADDERS) {
    ladder.forEach((slug, i) => {
      if (i > 0) easierOf.set(slug, ladder[i - 1]!)
      if (i < ladder.length - 1) harderOf.set(slug, ladder[i + 1]!)
    })
  }
  for (const e of EXERCISES) {
    const easier = easierOf.get(e.slug)
    const harder = harderOf.get(e.slug)
    await prisma.exercise.update({
      where: { slug: e.slug },
      data: { easierId: easier ? idOf.get(easier)! : null, harderId: harder ? idOf.get(harder)! : null },
    })
  }

  const total = await prisma.exercise.count()
  const linked = await prisma.exercise.count({ where: { OR: [{ easierId: { not: null } }, { harderId: { not: null } }] } })
  console.log(`Seeded ${EXERCISES.length} exercises (${total} rows in the table, ${linked} with a ladder link).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
