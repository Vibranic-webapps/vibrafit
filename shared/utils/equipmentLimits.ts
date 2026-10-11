// Equipment caps: the one place they live. The API enforces them
// (400 'equipment_too_large', data.limit = the key below) and the equipment
// screen mirrors them so it can warn before saving.
//
// They exist because buildableLoads() gets expensive fast. Measured with
// irregular plate weights: 4 weights x 20 plates took 4 s, 6 x 10 took 25 s,
// 12 x 20 ran out of memory. Capping the TOTAL number of plates keeps the worst
// case around 30 ms, in the browser and on the server.

export const EQUIPMENT_LIMITS = {
  handleCount: 4,
  handleGrams: 20_000,
  plateTypes: 12,
  plateTotal: 24, // all plates together; the real load limiter
  plateGrams: 50_000,
  count: 20, // per row (plates, fixed weights, bands)
  fixedTypes: 10,
  fixedGrams: 100_000,
  bandTypes: 10,
  label: 40,
  resistance: 40,
} as const

export type EquipmentLimit = keyof typeof EQUIPMENT_LIMITS
