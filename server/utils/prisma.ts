import { PrismaClient } from '@prisma/client'

// One PrismaClient per process. In dev, Nuxt hot-reloads modules, so without
// stashing it on globalThis you leak a new connection pool on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
