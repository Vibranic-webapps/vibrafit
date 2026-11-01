import type { LoadOption } from './loads'

export interface LoadsSummary {
  /** How many different loads can be built (pairs and singles together). */
  count: number
  /** Lightest and heaviest load in grams, or null when there are none. */
  minGrams: number | null
  maxGrams: number | null
}

/** The one-line facts about a list of loads: "14 loads, 2 to 8 kg". */
export function summarizeLoads(options: LoadOption[]): LoadsSummary {
  if (!options.length) return { count: 0, minGrams: null, maxGrams: null }
  let min = Infinity
  let max = -Infinity
  for (const o of options) {
    if (o.grams < min) min = o.grams
    if (o.grams > max) max = o.grams
  }
  return { count: options.length, minGrams: min, maxGrams: max }
}
