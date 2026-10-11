/**
 * kg <-> grams helpers. People type kilograms ("1.25"); everything stored or
 * calculated is INTEGER GRAMS (non-negotiable #2), so convert at the edge.
 */

/** "1.25" or "1,25" -> 1250. Returns null when it isn't a plain non-negative number. */
export function kgToGrams(input: string): number | null {
  const text = input.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  return Math.round(Number(text) * 1000)
}

/** 1250 -> "1.25". Trailing zeros dropped; `maxDecimals` 2 for display, 3 keeps every gram. */
export function gramsToKg(grams: number, maxDecimals = 2): string {
  return String(Number((grams / 1000).toFixed(maxDecimals)))
}

/** Whole-number text ("3") -> 3, or null when it isn't a whole non-negative number. */
export function parseCount(input: string): number | null {
  const text = input.trim()
  return /^\d+$/.test(text) ? Number(text) : null
}
