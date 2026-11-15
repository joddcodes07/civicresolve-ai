// Public preview fixtures. They never enter complaint, account, or analytics tables.
import { prisma } from '../db.js'
import { pointInPolygon } from '../lib/geo.js'

const SCENARIOS = [
  ['Potholes & Bad Roads', 55, 5],
  ['Open / Missing Manhole', 86, 3],
  ['Streetlight Not Working', 38, 4],
  ['Garbage Not Collected', 46, 6],
  ['Water Pipeline Leak', 78, 2],
  ['Broken Footpath', 32, 1],
  ['Blocked Drain', 51, 3],
  ['Park Maintenance', 31, 2],
]

const DEMO_POINT_COUNT = 1400

// Stable coordinates and IDs across reloads, using a different sequence per ward.
function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

function sampleWard(ward, count, seed) {
  const boundary = ward.boundary
  const rings = boundary?.type === 'MultiPolygon'
    ? boundary.coordinates.map(([outer]) => outer)
    : [boundary?.coordinates?.[0] ?? []]
  const vertices = rings.flat()
  if (!vertices.length) return []
  const lngs = vertices.map(([lng]) => lng)
  const lats = vertices.map(([, lat]) => lat)
  const west = Math.min(...lngs), east = Math.max(...lngs)
  const south = Math.min(...lats), north = Math.max(...lats)
  const random = randomSequence(seed)
  const points = []
  for (let attempt = 0; attempt < count * 200 && points.length < count; attempt++) {
    const lat = south + random() * (north - south)
    const lng = west + random() * (east - west)
    if (pointInPolygon(lat, lng, boundary)) points.push({ lat, lng })
  }
  return points
}

export async function getDemoIssues() {
  const [wards, categories] = await Promise.all([
    prisma.ward.findMany({ orderBy: [{ lng: 'asc' }, { name: 'asc' }], select: { id: true, name: true, boundary: true } }),
    prisma.category.findMany({
      where: { name: { in: SCENARIOS.map(([name]) => name) } },
      include: { department: true },
    }),
  ])
  const byName = new Map(categories.map((category) => [category.name, category]))
  const scenarios = SCENARIOS.filter(([name]) => byName.has(name))
  if (!scenarios.length || !wards.length) return []
  const pointsPerWard = Math.ceil(DEMO_POINT_COUNT / wards.length)
  const pointsByWard = wards.map((ward, index) =>
    sampleWard(ward, pointsPerWard, index + 1).map((point) => ({ ...point, ward })),
  )
  const points = Array.from({ length: pointsPerWard }, (_, index) =>
    pointsByWard.map((points) => points[index]).filter(Boolean),
  ).flat().slice(0, DEMO_POINT_COUNT)
  return points.map((point, index) => {
    const [name, priority, reportCount] = scenarios[index % scenarios.length]
    const code = `DEMO-${String(index + 1).padStart(4, '0')}`
    return {
      ...point, id: code, code, category: byName.get(name), priority, reportCount, demo: true,
      status: index % 13 === 0 ? 'CONFIRMED' : index % 13 < 4 ? 'RESOLVED' : 'OPEN',
    }
  })
}

export function getDemoStats(issues) {
  const total = issues.reduce((sum, issue) => sum + issue.reportCount, 0)
  const resolved = issues.filter((issue) => issue.status !== 'OPEN').reduce((sum, issue) => sum + issue.reportCount, 0)
  const verified = issues.filter((issue) => issue.status === 'CONFIRMED').reduce((sum, issue) => sum + issue.reportCount, 0)
  return { total, resolved, verified, issues: issues.length, verifiedRate: resolved ? Math.round(100 * verified / resolved) : 0 }
}
