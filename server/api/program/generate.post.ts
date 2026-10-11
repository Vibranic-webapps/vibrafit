import { requireUserId } from '~~/server/utils/auth'
import { regenerateProgram } from '~~/server/utils/programStore'

// (Re)build the program from the user's current equipment. No body: the gear
// is read server-side, never trusted from the client. Same shape as GET.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return regenerateProgram(userId)
})
