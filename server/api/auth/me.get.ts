import { prisma } from '~~/server/utils/prisma'
import { requireUserId, toAuthUser } from '~~/server/utils/auth'
import { apiError } from '~~/server/utils/errors'

// The current user, or 401 `not_authenticated`.
// (Vibravault answered `null` here; Vibrafit uses a plain 401 so every
// protected endpoint behaves the same. The route middleware catches it.)
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) apiError(401, 'not_authenticated')

  return toAuthUser(user)
})
