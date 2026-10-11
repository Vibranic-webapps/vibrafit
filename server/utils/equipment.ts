import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { apiError } from './errors'
import { cleanName } from './validate'
import { buildableLoads } from '~~/shared/utils/loads'
import { EQUIPMENT_LIMITS } from '~~/shared/utils/equipmentLimits'

// Equipment: reading, validating and replacing what a user owns.
// All weights are integer grams (project rule #2).

/** What GET/PUT /api/equipment speak. Superset of Equipment in shared/utils/loads.ts. */
export interface EquipmentDto {
  handles: { count: number; grams: number }
  plates: { grams: number; count: number }[]
  fixed: { grams: number; count: number; label: string }[]
  bands: { label: string; resistance: string | null; count: number }[]
}

export const EMPTY_EQUIPMENT: EquipmentDto = {
  handles: { count: 0, grams: 0 },
  plates: [],
  fixed: [],
  bands: [],
}

// --- Reading ---------------------------------------------------------------

export async function getEquipment(userId: string): Promise<EquipmentDto> {
  const [equipment, plates, fixed, bands] = await Promise.all([
    prisma.equipment.findUnique({ where: { userId } }),
    prisma.plate.findMany({ where: { userId }, orderBy: { grams: 'desc' } }),
    prisma.fixedWeight.findMany({ where: { userId }, orderBy: [{ grams: 'asc' }, { label: 'asc' }] }),
    prisma.band.findMany({ where: { userId }, orderBy: [{ label: 'asc' }, { resistance: 'asc' }] }),
  ])
  return {
    handles: { count: equipment?.handleCount ?? 0, grams: equipment?.handleGrams ?? 0 },
    plates: plates.map((p) => ({ grams: p.grams, count: p.count })),
    fixed: fixed.map((f) => ({ grams: f.grams, count: f.count, label: f.label })),
    bands: bands.map((b) => ({ label: b.label, resistance: b.resistance, count: b.count })),
  }
}

// --- Validating ------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** A whole number >= min, or a 400. Floats, strings, NaN and null all fail. */
function wholeNumber(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    apiError(400, 'invalid_input')
  }
  return value
}

function tooLarge(limit: keyof typeof EQUIPMENT_LIMITS): never {
  apiError(400, 'equipment_too_large', { limit, max: EQUIPMENT_LIMITS[limit] })
}

function list(value: unknown, max: number, limit: keyof typeof EQUIPMENT_LIMITS): Record<string, unknown>[] {
  if (!Array.isArray(value)) apiError(400, 'invalid_input')
  if (value.length > max) tooLarge(limit)
  return value.map((row) => {
    if (!isRecord(row)) apiError(400, 'invalid_input')
    return row
  })
}

function amount(value: unknown, min: number, max: number, limit: keyof typeof EQUIPMENT_LIMITS): number {
  const n = wholeNumber(value, min)
  if (n > max) tooLarge(limit)
  return n
}

function label(value: unknown): string {
  if (typeof value !== 'string') apiError(400, 'invalid_input')
  const clean = cleanName(value)
  if (clean.length < 1 || clean.length > EQUIPMENT_LIMITS.label) apiError(400, 'invalid_input')
  return clean
}

/**
 * The request body as a clean EquipmentDto, or a 400.
 *  - invalid_input: wrong shape/type, floats, negatives, bad labels, or a body
 *    the load calculator rejects.
 *  - equipment_too_large: well-formed but above a cap in EQUIPMENT_LIMITS.
 * Duplicate plate weights are merged; plates come back heaviest first.
 */
export function parseEquipment(body: Record<string, unknown>): EquipmentDto {
  const L = EQUIPMENT_LIMITS

  if (!isRecord(body.handles)) apiError(400, 'invalid_input')
  const handles = {
    count: amount(body.handles.count, 0, L.handleCount, 'handleCount'),
    grams: amount(body.handles.grams, 0, L.handleGrams, 'handleGrams'),
  }

  // Row-level checks first, merge, then the caps that depend on the result.
  const rawPlates = list(body.plates, L.plateTypes, 'plateTypes')
  const merged = new Map<number, number>()
  for (const row of rawPlates) {
    const grams = amount(row.grams, 1, L.plateGrams, 'plateGrams')
    const count = amount(row.count, 0, L.count, 'count')
    merged.set(grams, (merged.get(grams) ?? 0) + count)
  }
  if (merged.size > L.plateTypes) tooLarge('plateTypes')
  const plates = [...merged]
    .map(([grams, count]) => ({ grams, count }))
    .sort((a, b) => b.grams - a.grams)
  // Merging can push one weight over the per-row cap.
  if (plates.some((p) => p.count > L.count)) tooLarge('count')
  if (plates.reduce((sum, p) => sum + p.count, 0) > L.plateTotal) tooLarge('plateTotal')

  const fixed = list(body.fixed, L.fixedTypes, 'fixedTypes').map((row) => ({
    grams: amount(row.grams, 1, L.fixedGrams, 'fixedGrams'),
    count: amount(row.count, 0, L.count, 'count'),
    label: label(row.label),
  }))

  const bands = list(body.bands, L.bandTypes, 'bandTypes').map((row) => {
    let resistance: string | null = null
    if (row.resistance !== null && row.resistance !== undefined) {
      if (typeof row.resistance !== 'string') apiError(400, 'invalid_input')
      const clean = cleanName(row.resistance)
      if (clean.length > L.resistance) apiError(400, 'invalid_input')
      resistance = clean || null
    }
    return { label: label(row.label), resistance, count: amount(row.count, 0, L.count, 'count') }
  })

  const equipment: EquipmentDto = { handles, plates, fixed, bands }

  // Sanity check: whatever we store, the load calculator must be able to chew on.
  try {
    buildableLoads({ handles, plates, fixed })
  } catch (error) {
    if (error instanceof RangeError) apiError(400, 'invalid_input')
    throw error
  }

  return equipment
}

// --- Writing ---------------------------------------------------------------

async function writeEquipment(userId: string, data: EquipmentDto): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Upserting the 1:1 row first also locks it, so a second PUT at the same
    // moment waits for this one instead of interleaving its deletes/inserts.
    await tx.equipment.upsert({
      where: { userId },
      create: { userId, handleCount: data.handles.count, handleGrams: data.handles.grams },
      update: { handleCount: data.handles.count, handleGrams: data.handles.grams },
    })
    await tx.plate.deleteMany({ where: { userId } })
    await tx.fixedWeight.deleteMany({ where: { userId } })
    await tx.band.deleteMany({ where: { userId } })
    await tx.plate.createMany({ data: data.plates.map((p) => ({ userId, ...p })) })
    await tx.fixedWeight.createMany({ data: data.fixed.map((f) => ({ userId, ...f })) })
    await tx.band.createMany({ data: data.bands.map((b) => ({ userId, ...b })) })
  })
}

/** Replace the user's whole equipment in ONE transaction; returns the saved shape. */
export async function replaceEquipment(userId: string, data: EquipmentDto): Promise<EquipmentDto> {
  try {
    await writeEquipment(userId, data)
  } catch (error) {
    // Two first-ever saves at once can both try to create the 1:1 row; the
    // loser hits the unique key. Retrying once is safe: it is a full replace.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      await writeEquipment(userId, data)
    } else {
      throw error
    }
  }
  return getEquipment(userId)
}
