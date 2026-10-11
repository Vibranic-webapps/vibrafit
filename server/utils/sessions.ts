import { prisma } from './prisma'
import { apiError } from './errors'
import { brusselsDate } from '~~/shared/utils/brusselsDate'
import { inProgressCutoff, nextDayKey } from '~~/shared/utils/today'
import {
  collapseSessions,
  collapseSets,
  mergeSessionUpdate,
  sessionDateProblem,
  type SessionIn,
  type SetIn,
  type SyncBody,
} from '~~/shared/utils/sessionSync'

// Workout sessions and sets: the database side of the offline queue.
// The rules are pure and tested in shared/utils/sessionSync.ts and today.ts.
// Every query is scoped to the user (non-negotiable #7).

// --- POST /api/sessions/sync ----------------------------------------------

export type RejectReason = 'invalid_date' | 'date_out_of_range' | 'unknown_session' | 'unknown_exercise' | 'session_mismatch'

export interface SyncResult {
  /** clientIds now stored (new, updated or already identical). */
  sessions: string[]
  sets: string[]
  /** Items the client cannot fix by retrying. Everything else in the batch was saved. */
  rejected: { clientId: string; kind: 'session' | 'set'; reason: RejectReason }[]
}

const dbDate = (date: string) => new Date(`${date}T00:00:00Z`)

/**
 * Save a batch of sessions and sets, idempotently, in ONE transaction. The
 * client may send the same items any number of times: sessions merge by
 * (user, clientId) under mergeSessionUpdate, sets overwrite by (user, clientId).
 * One bad item never fails the batch; it lands in `rejected`.
 */
export async function syncWorkout(userId: string, body: SyncBody, now: Date = new Date()): Promise<SyncResult> {
  const today = brusselsDate(now)
  const sessionsIn = collapseSessions(body.sessions)
  const setsIn = collapseSets(body.sets)
  const rejected: SyncResult['rejected'] = []

  const sessionIds = [...new Set([...sessionsIn.map((s) => s.clientId), ...setsIn.map((s) => s.sessionClientId)])]
  const slugs = [...new Set(setsIn.map((s) => s.exerciseSlug))]
  const setIds = setsIn.map((s) => s.clientId)

  return prisma.$transaction(
    async (tx) => {
      const [days, storedSessions, exercises, storedSets] = await Promise.all([
        tx.programDay.findMany({ where: { userId }, select: { id: true, key: true } }),
        tx.workoutSession.findMany({ where: { userId, clientId: { in: sessionIds } } }),
        tx.exercise.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } }),
        tx.setLog.findMany({ where: { userId, clientId: { in: setIds } } }),
      ])
      const dayId = new Map(days.map((d) => [d.key, d.id]))
      const stored = new Map(storedSessions.map((s) => [s.clientId, s]))

      // Sessions: merge into the stored one, or create (new ones must pass the date window).
      const toCreate: SessionIn[] = []
      for (const item of sessionsIn) {
        const existing = stored.get(item.clientId)
        if (existing) {
          const patch = mergeSessionUpdate(existing, {
            isShort: item.isShort,
            finishedAt: item.finishedAt ? new Date(item.finishedAt) : null,
          })
          if (patch) await tx.workoutSession.update({ where: { id: existing.id }, data: patch })
          continue
        }
        const problem = sessionDateProblem(item.date, today)
        if (problem) rejected.push({ clientId: item.clientId, kind: 'session', reason: problem })
        else toCreate.push(item)
      }
      if (toCreate.length) {
        // skipDuplicates: a parallel identical request may have created it first. Not an error.
        await tx.workoutSession.createMany({
          skipDuplicates: true,
          data: toCreate.map((s) => ({
            userId,
            clientId: s.clientId,
            programDayId: dayId.get(s.dayKey) ?? null,
            date: dbDate(s.date),
            isShort: s.isShort,
            startedAt: new Date(s.startedAt),
            finishedAt: s.finishedAt ? new Date(s.finishedAt) : null,
          })),
        })
      }

      // Everything the sets can attach to, as it is in the database now.
      const sessionRows = new Map(
        (await tx.workoutSession.findMany({ where: { userId, clientId: { in: sessionIds } }, select: { id: true, clientId: true } })).map((s) => [
          s.clientId,
          s.id,
        ]),
      )
      const exerciseId = new Map(exercises.map((e) => [e.slug, e.id]))
      const storedSet = new Map(storedSets.map((s) => [s.clientId, s]))

      const newSets: SetIn[] = []
      const accepted: string[] = []
      for (const item of setsIn) {
        const sessionId = sessionRows.get(item.sessionClientId)
        const exId = exerciseId.get(item.exerciseSlug)
        const existing = storedSet.get(item.clientId)
        const reject = (reason: RejectReason) => rejected.push({ clientId: item.clientId, kind: 'set', reason })

        if (!sessionId) reject('unknown_session')
        else if (!exId) reject('unknown_exercise')
        else if (existing && existing.sessionId !== sessionId) reject('session_mismatch')
        else if (!existing) {
          newSets.push(item)
          accepted.push(item.clientId)
        } else {
          // "Fix last set": overwrite the values, never add a second row.
          const loggedAt = new Date(item.loggedAt)
          const changed =
            existing.amount !== item.amount ||
            existing.loadGrams !== item.loadGrams ||
            existing.feeling !== item.feeling ||
            existing.skippedForPain !== item.skippedForPain ||
            existing.loggedAt.getTime() !== loggedAt.getTime()
          if (changed) {
            await tx.setLog.update({
              where: { id: existing.id },
              data: { amount: item.amount, loadGrams: item.loadGrams, feeling: item.feeling, skippedForPain: item.skippedForPain, loggedAt },
            })
          }
          accepted.push(item.clientId)
        }
      }
      if (newSets.length) {
        await tx.setLog.createMany({
          skipDuplicates: true,
          data: newSets.map((s) => ({
            userId,
            clientId: s.clientId,
            sessionId: sessionRows.get(s.sessionClientId)!,
            exerciseId: exerciseId.get(s.exerciseSlug)!,
            setNumber: s.setNumber,
            amount: s.amount,
            loadGrams: s.loadGrams,
            feeling: s.feeling,
            skippedForPain: s.skippedForPain,
            loggedAt: new Date(s.loggedAt),
          })),
        })
      }

      const rejectedSessions = new Set(rejected.filter((r) => r.kind === 'session').map((r) => r.clientId))
      return {
        sessions: sessionsIn.map((s) => s.clientId).filter((id) => !rejectedSessions.has(id)),
        sets: accepted,
        rejected,
      }
    },
    // Up to 300 sets from a phone that was offline for days: give the batch room.
    { timeout: 20_000, maxWait: 5_000 },
  )
}

// --- GET /api/sessions/:clientId ------------------------------------------

export interface SessionDto {
  session: { clientId: string; dayKey: string | null; isShort: boolean; date: string; startedAt: string; finishedAt: string | null }
  sets: SetIn[]
}

/** One of the user's sessions with its sets, or a 404 (also for another user's clientId). */
export async function getWorkoutSession(userId: string, clientId: string): Promise<SessionDto> {
  const session = await prisma.workoutSession.findUnique({
    where: { userId_clientId: { userId, clientId } },
    include: {
      programDay: { select: { key: true, exercises: { select: { exerciseId: true, order: true } } } },
      setLogs: { include: { exercise: { select: { slug: true } } } },
    },
  })
  if (!session) apiError(404, 'not_found')

  // Exercise order of the program day; exercises it no longer has go last.
  const order = new Map((session.programDay?.exercises ?? []).map((e) => [e.exerciseId, e.order]))
  const rank = (exerciseId: string) => order.get(exerciseId) ?? Number.MAX_SAFE_INTEGER
  const sets = [...session.setLogs].sort(
    (a, b) =>
      rank(a.exerciseId) - rank(b.exerciseId) ||
      a.exerciseId.localeCompare(b.exerciseId) ||
      a.setNumber - b.setNumber ||
      a.loggedAt.getTime() - b.loggedAt.getTime(),
  )

  return {
    session: {
      clientId: session.clientId,
      dayKey: session.programDay?.key ?? null,
      isShort: session.isShort,
      date: session.date.toISOString().slice(0, 10),
      startedAt: session.startedAt.toISOString(),
      finishedAt: session.finishedAt?.toISOString() ?? null,
    },
    sets: sets.map((s) => ({
      clientId: s.clientId,
      sessionClientId: session.clientId,
      exerciseSlug: s.exercise.slug,
      setNumber: s.setNumber,
      amount: s.amount,
      loadGrams: s.loadGrams,
      feeling: s.feeling,
      skippedForPain: s.skippedForPain,
      loggedAt: s.loggedAt.toISOString(),
    })),
  }
}

// --- GET /api/today ---------------------------------------------------------

export interface TodayDto {
  date: string
  hasEquipment: boolean
  hasProgram: boolean
  nextDayKey: string | null
  inProgress: { clientId: string; dayKey: string | null; isShort: boolean; startedAt: string } | null
  finishedToday: { clientId: string; dayKey: string | null; setCount: number } | null
}

export async function getToday(userId: string, now: Date = new Date()): Promise<TodayDto> {
  const date = brusselsDate(now)
  // A set counts as trained when it has an amount and was not skipped for pain.
  const trained = { amount: { not: null }, skippedForPain: false } as const

  const [equipment, plates, fixed, bands, days, lastTrained, running, finished] = await Promise.all([
    prisma.equipment.findUnique({ where: { userId }, select: { handleCount: true } }),
    prisma.plate.count({ where: { userId, count: { gt: 0 } } }),
    prisma.fixedWeight.count({ where: { userId, count: { gt: 0 } } }),
    prisma.band.count({ where: { userId, count: { gt: 0 } } }),
    prisma.programDay.findMany({ where: { userId }, orderBy: { order: 'asc' }, select: { key: true } }),
    prisma.workoutSession.findFirst({
      where: { userId, setLogs: { some: trained } },
      orderBy: { startedAt: 'desc' },
      select: { programDay: { select: { key: true } } },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, finishedAt: null, startedAt: { gte: inProgressCutoff(now) } },
      orderBy: { startedAt: 'desc' },
      select: { clientId: true, isShort: true, startedAt: true, programDay: { select: { key: true } } },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, finishedAt: { not: null }, date: new Date(`${date}T00:00:00Z`) },
      orderBy: { finishedAt: 'desc' },
      select: { id: true, clientId: true, programDay: { select: { key: true } } },
    }),
  ])

  const setCount = finished ? await prisma.setLog.count({ where: { userId, sessionId: finished.id, skippedForPain: false } }) : 0

  return {
    date,
    hasEquipment: (equipment?.handleCount ?? 0) > 0 || plates + fixed + bands > 0,
    hasProgram: days.length > 0,
    nextDayKey: nextDayKey(
      days.map((d) => d.key),
      lastTrained?.programDay?.key ?? null,
    ),
    inProgress: running
      ? { clientId: running.clientId, dayKey: running.programDay?.key ?? null, isShort: running.isShort, startedAt: running.startedAt.toISOString() }
      : null,
    finishedToday: finished ? { clientId: finished.clientId, dayKey: finished.programDay?.key ?? null, setCount } : null,
  }
}
