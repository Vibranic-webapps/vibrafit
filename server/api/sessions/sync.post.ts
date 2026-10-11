import { requireUserId } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { syncWorkout } from '~~/server/utils/sessions'
import { parseSyncBody } from '~~/shared/utils/sessionSync'

// The offline queue's one endpoint. Idempotent: the client may resend the same
// sessions and sets any number of times. A wrong body shape is a 400; a single
// bad item lands in `rejected` and never fails the rest.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = parseSyncBody(await readJsonObject(event))
  if (!body) apiError(400, 'invalid_input')
  return syncWorkout(userId, body)
})
