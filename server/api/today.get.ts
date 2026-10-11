import { requireUserId } from '~~/server/utils/auth'
import { getToday } from '~~/server/utils/sessions'

// What the Today screen needs: the Brussels date, what's set up, which day is
// next, and any workout in progress or already finished today.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return getToday(userId)
})
