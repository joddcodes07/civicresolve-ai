// F4 · Duplicate issue matching.
// A new complaint joins an existing Issue when ALL four checks pass:
//   ① same category  ② the older issue is still open
//   ③ distance ≤ the category radius  ④ text similarity ≥ threshold
// Distance is haversine (metres); similarity is cosine over token frequencies.

import { prisma } from '../db.js'
import { haversineMetres } from '../lib/geo.js'
import { cosineSimilarity, tokenize } from '../lib/text.js'
import { nextIssueCode } from '../lib/ids.js'

export const SIMILARITY_THRESHOLD = 0.8
const LOOKBACK_DAYS = 14
const OPEN_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'NEEDS_REVIEW']

export function textSimilarity(a, b) {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  let inter = 0
  for (const t of setA) if (setB.has(t)) inter++

  const minSize = Math.min(setA.size, setB.size)
  const overlap = minSize ? inter / minSize : 0
  const union = setA.size + setB.size - inter
  const jaccardScore = union ? inter / union : 0
  const cosine = cosineSimilarity(a, b)

  // Containment: one report is essentially a shorter restatement of the other
  // (e.g. "manhole missing near school" ⊂ the fuller sentence). Discounted a
  // little and only counted once a few content words are genuinely shared, so a
  // couple of generic words can't create a false merge.
  const containment = inter >= 3 ? overlap * 0.92 : 0

  return Math.max(cosine, jaccardScore * 0.95, containment)
}

function boundingBox(lat, lng, radiusMetres) {
  const dLat = radiusMetres / 111_320
  const dLng = radiusMetres / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

/**
 * Find the best duplicate candidate among recent open complaints of the same category.
 * @param {{ categoryId:string, lat:number, lng:number, text:string, radiusMetres?:number }} input
 */
export async function findDuplicateCandidate({ categoryId, lat, lng, text, radiusMetres = 50 }) {
  if (!categoryId) return null
  const box = boundingBox(lat, lng, radiusMetres)
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000)

  const candidates = await prisma.complaint.findMany({
    where: {
      categoryId,
      status: { in: OPEN_STATUSES },
      createdAt: { gte: since },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, code: true, issueId: true, lat: true, lng: true, wardId: true,
      englishText: true, originalText: true, severity: true, safetyRisk: true,
    },
  })

  let best = null
  for (const c of candidates) {
    const distanceMetres = haversineMetres(lat, lng, c.lat, c.lng)
    if (distanceMetres > radiusMetres) continue
    const similarity = textSimilarity(text, c.englishText || c.originalText || '')
    if (similarity < SIMILARITY_THRESHOLD) continue
    if (!best || similarity > best.similarity) {
      best = { ...c, distanceMetres, similarity }
    }
  }
  return best
}

/**
 * Resolve the Issue this complaint belongs to: join an existing one (bumping the
 * report count) or create a fresh Issue.
 * @returns {{ issueId:string, reportCount:number, merged:boolean, match?:object }}
 */
export async function resolveIssue({ categoryId, lat, lng, wardId, text, radiusMetres = 50 }) {
  const match = await findDuplicateCandidate({ categoryId, lat, lng, text, radiusMetres })

  if (match) {
    let issueId = match.issueId
    if (!issueId) {
      // The matched complaint was never grouped — promote it to an issue.
      const code = await nextIssueCode()
      const issue = await prisma.issue.create({
        data: { code, categoryId, lat: match.lat, lng: match.lng, wardId: match.wardId, reportCount: 2, priority: 0 },
      })
      await prisma.complaint.update({ where: { id: match.id }, data: { issueId: issue.id } })
      issueId = issue.id
    } else {
      await prisma.issue.update({ where: { id: issueId }, data: { reportCount: { increment: 1 } } })
    }
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, reportCount: true, code: true } })
    return {
      issueId: issue.id,
      reportCount: issue.reportCount,
      merged: true,
      match: {
        code: match.code,
        distanceMetres: Math.round(match.distanceMetres),
        similarity: Number(match.similarity.toFixed(3)),
        issueCode: issue.code,
      },
    }
  }

  const code = await nextIssueCode()
  const issue = await prisma.issue.create({
    data: { code, categoryId, lat, lng, wardId: wardId || null, reportCount: 1, priority: 0 },
  })
  return { issueId: issue.id, reportCount: 1, merged: false }
}
