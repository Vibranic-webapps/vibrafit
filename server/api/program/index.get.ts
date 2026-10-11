import { requireUserId } from '~~/server/utils/auth'
import { getProgram } from '~~/server/utils/programStore'

// The signed-in user's program. None generated yet = { days: [] }, not a 404.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return getProgram(userId)
})
