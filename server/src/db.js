// Single PrismaClient instance shared across the app.
// Prisma 7 requires a driver adapter for the runtime connection.
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'

const adapter = new PrismaPg({ connectionString: env.databaseUrl })

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
})

export async function disconnectDb() {
  await prisma.$disconnect()
}
