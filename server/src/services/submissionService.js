import { prisma } from '../db.js'
import { HttpError } from '../middleware/error.js'
import { pointInPolygon } from '../lib/geo.js'
import { env } from '../env.js'

// Per-account lock makes count + insert atomic across concurrent API workers.
export async function withDailyQuota(citizenId, action) {
  if (!citizenId) throw new HttpError(401, 'Sign in before submitting a complaint')
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${citizenId}))`
    const start = indiaDayStart()
    const count = await tx.complaint.count({ where: { citizenId, createdAt: { gte: start } } })
    if (count >= 5) throw new HttpError(429, 'You can submit up to 5 complaints per day (India time).')
    return action(tx)
  }, { timeout: 20000 })
}
export function indiaDayStart(now = new Date()) {
  const offset = 330 * 60_000
  const local = new Date(now.getTime() + offset)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset)
}
export async function validatePuneLocation(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'A valid location is required')
  const boundary = await prisma.setting.findUnique({ where: { key: 'puneBoundary' } })
  if (boundary) {
    if (!pointInPolygon(lat, lng, JSON.parse(boundary.value))) throw new HttpError(400, 'Location must be inside Pune municipal limits')
  } else {
    if (env.nodeEnv === 'production') throw new HttpError(503, 'Import a verified Pune boundary before accepting complaints')
    if (lat < 18.35 || lat > 18.75 || lng < 73.65 || lng > 74.05) throw new HttpError(400, 'Location must be in Pune')
  }
}
