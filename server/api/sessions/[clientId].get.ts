import { requireUserId } from '~~/server/utils/auth'
import { apiError } from '~~/server/utils/errors'
import { getWorkoutSession } from '~~/server/utils/sessions'

// One of the signed-in user's sessions with its sets. Unknown id, malformed id
// or another user's id all answer the same 404.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const clientId = getRouterParam(event, 'clientId') ?? ''
  if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) apiError(404, 'not_found')
  return getWorkoutSession(userId, clientId)
})
