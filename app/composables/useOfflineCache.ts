/**
 * Remembers the last good answers from /api/program and /api/today on the
 * phone, so Today can show the workout and a session can START while offline.
 * Per user ("vf:<userId>:program" / ":today").
 */
import type { ProgramDto, TodayDto } from '~/utils/workoutTypes'

interface Cached<T> {
  savedAt: string
  data: T
}

const PROGRAM_URL: string = '/api/program'
const TODAY_URL: string = '/api/today'

export function useOfflineCache() {
  const user = useAuthUser()

  function key(name: string): string | null {
    return user.value ? userKey(user.value.id, name) : null
  }

  function read<T>(name: string): T | null {
    const k = key(name)
    return k ? (readJson<Cached<T> | null>(k, null)?.data ?? null) : null
  }

  function write<T>(name: string, data: T) {
    const k = key(name)
    if (k) writeJson(k, { savedAt: new Date().toISOString(), data } satisfies Cached<T>)
  }

  return {
    readProgram: () => read<ProgramDto>('program'),
    readToday: () => read<TodayDto>('today'),
    writeToday: (today: TodayDto) => write('today', today),

    /** Fresh program from the server, remembered for offline use. Throws when offline. */
    async fetchProgram(): Promise<ProgramDto> {
      const program = await $fetch<ProgramDto>(PROGRAM_URL)
      write('program', program)
      return program
    },
    writeProgram: (program: ProgramDto) => write('program', program),

    async fetchToday(): Promise<TodayDto> {
      const today = await $fetch<TodayDto>(TODAY_URL)
      write('today', today)
      return today
    },
  }
}
