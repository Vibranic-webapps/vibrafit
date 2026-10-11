import { requireUserId } from '~~/server/utils/auth'
import { readJsonObject } from '~~/server/utils/errors'
import { parseEquipment, replaceEquipment } from '~~/server/utils/equipment'

// Replace the user's whole equipment (handles, plates, fixed weights, bands)
// in one transaction. Same body in as GET returns out.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readJsonObject(event)
  return replaceEquipment(userId, parseEquipment(body))
})
