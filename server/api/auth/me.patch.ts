import { prisma } from '~~/server/utils/prisma'
import { requireUserId, toAuthUser } from '~~/server/utils/auth'
import { apiError, readJsonObject } from '~~/server/utils/errors'
import { cleanName } from '~~/server/utils/validate'
import { NAME_MAX } from '~~/shared/utils/password'

// Update your own profile. Only `name` for now. An empty string or null
// clears it (the app then greets you without a name).
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readJsonObject(event)

  if (!('name' in body)) apiError(400, 'invalid_input')
  if (body.name !== null && typeof body.name !== 'string') apiError(400, 'invalid_input')

  const name = cleanName(body.name ?? '')
  if (name.length > NAME_MAX) apiError(400, 'name_too_long', { max: NAME_MAX })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: name || null },
    select: { id: true, email: true, name: true },
  })
  return toAuthUser(user)
})
