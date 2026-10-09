import { destroySession } from '~~/server/utils/auth'

// Always succeeds, even with no (or an already-expired) session: "make sure
// I'm logged out" has the same answer either way.
export default defineEventHandler(async (event) => {
  await destroySession(event)
  return { ok: true }
})
