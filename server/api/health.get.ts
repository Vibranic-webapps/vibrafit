import { prisma } from '~~/server/utils/prisma'
import { checkHealth } from '~~/server/utils/health'

// Public on purpose: the Pi (Nova Hub) polls it. Never cached, so a dead
// database can't hide behind a stored "ok". See server/utils/health.ts.
export default defineEventHandler(async (event) => {
  const { status, body } = await checkHealth(() => prisma.$queryRaw`SELECT 1`)
  setResponseStatus(event, status)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return body
})
