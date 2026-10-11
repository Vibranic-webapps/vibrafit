// The starter program as DATA (project rule #3): days A and B from
// "(C) Starter program + equipment". generateProgram() in server/utils/program.ts
// turns this plus the user's gear into a concrete program.
//
// A slot is one position in the workout. Its candidates are tried in order and
// the first one the user's gear supports wins, so every slot ends with a
// bodyweight candidate: nobody ends up with a half-empty program.
//
// Loads: `startGrams` is the load IN ONE HAND the note recommends (a 4 kg pair
// = 4000 + pair). The generator only ever picks a load the user can build, at
// or below this, so a beginner starts a little light rather than a little heavy.
//
// Rep ranges are a range, not the note's single number, because progression
// needs a range to climb. They are a starting guess: change them here.

import type { ProgramTemplate } from '../utils/program.ts'

export const STARTER_PROGRAM: ProgramTemplate = {
  // Load picking (see pickLoad in server/utils/program.ts), as % of the start load:
  //  - minUnderPercent: the heaviest load at or below the start only counts if it
  //    is at least this much of it (a 1.85 kg "goblet squat" is not a goblet squat).
  //  - maxOverPercent: otherwise the next load UP counts if it is at most this much.
  // Neither fits? The slot tries its next candidate.
  loadRules: { minUnderPercent: 50, maxOverPercent: 125 },

  // The 10-minute "low energy" version of any day: its first N slots, at most M sets each.
  shortVersion: { maxSlots: 3, maxSets: 2 },

  days: [
    {
      key: 'A',
      slots: [
        {
          sets: 3,
          targetMin: 10,
          targetMax: 12,
          candidates: [
            { slug: 'goblet-squat', load: { mode: 'single', startGrams: 8000 } },
            { slug: 'bodyweight-squat', targetMin: 12, targetMax: 20 },
          ],
        },
        {
          // The note says "max good reps"; 5 to 12 is the working range.
          sets: 3,
          targetMin: 5,
          targetMax: 12,
          candidates: [{ slug: 'push-up' }],
        },
        {
          sets: 3,
          targetMin: 8,
          targetMax: 12,
          candidates: [
            { slug: 'one-arm-row', load: { mode: 'single', startGrams: 8000 } },
            { slug: 'bent-over-row', load: { mode: 'pair', startGrams: 4000 } },
            { slug: 'towel-row' },
          ],
        },
        {
          sets: 3,
          targetMin: 12,
          targetMax: 20,
          candidates: [{ slug: 'band-pull-apart' }, { slug: 'prone-y-t-raise', targetMin: 8, targetMax: 12 }],
        },
        {
          sets: 3,
          targetMin: 8,
          targetMax: 12,
          candidates: [
            { slug: 'overhead-press', load: { mode: 'pair', startGrams: 4000 } },
            { slug: 'pike-push-up', targetMin: 5, targetMax: 10 },
          ],
        },
        {
          sets: 3,
          targetMin: 20,
          targetMax: 40, // seconds
          candidates: [{ slug: 'plank' }],
        },
      ],
    },
    {
      key: 'B',
      slots: [
        {
          sets: 3,
          targetMin: 10,
          targetMax: 15,
          candidates: [
            { slug: 'romanian-deadlift', load: { mode: 'pair', startGrams: 4000 } },
            { slug: 'romanian-deadlift', load: { mode: 'single', startGrams: 8000 } },
            { slug: 'glute-bridge', targetMin: 12, targetMax: 20 },
          ],
        },
        {
          sets: 3,
          targetMin: 6,
          targetMax: 10, // per leg
          candidates: [
            { slug: 'reverse-lunge', load: { mode: 'pair', startGrams: 4000 } },
            { slug: 'bodyweight-reverse-lunge', targetMin: 8, targetMax: 12 },
          ],
        },
        {
          sets: 3,
          targetMin: 12,
          targetMax: 15,
          candidates: [
            { slug: 'band-row' },
            { slug: 'bent-over-row', load: { mode: 'pair', startGrams: 4000 }, targetMin: 8, targetMax: 12 },
            { slug: 'towel-row', targetMin: 8, targetMax: 12 },
          ],
        },
        {
          sets: 3,
          targetMin: 10,
          targetMax: 15,
          candidates: [
            { slug: 'floor-press', load: { mode: 'pair', startGrams: 4000 } },
            { slug: 'push-up', targetMin: 5, targetMax: 12 },
          ],
        },
        {
          // "Curl + triceps extension, 2 x 12 each" is two slots.
          sets: 2,
          targetMin: 10,
          targetMax: 15,
          candidates: [
            { slug: 'curl', load: { mode: 'pair', startGrams: 2000 } },
            { slug: 'towel-curl', targetMin: 8, targetMax: 12 },
          ],
        },
        {
          sets: 2,
          targetMin: 10,
          targetMax: 15,
          candidates: [
            { slug: 'triceps-extension', load: { mode: 'pair', startGrams: 2000 } },
            { slug: 'close-grip-push-up', targetMin: 5, targetMax: 10 },
          ],
        },
        {
          sets: 3,
          targetMin: 8,
          targetMax: 12, // per side
          candidates: [
            { slug: 'russian-twist', load: { mode: 'single', startGrams: 5000 } },
            { slug: 'dead-bug', targetMin: 8, targetMax: 12 },
          ],
        },
      ],
    },
  ],
}
