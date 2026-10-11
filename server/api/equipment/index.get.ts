import { requireUserId } from '~~/server/utils/auth'
import { getEquipment } from '~~/server/utils/equipment'

// The signed-in user's equipment. No rows yet = an empty set, not a 404.
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return getEquipment(userId)
})
