// Public preview fixtures. They never enter complaint, account, or analytics tables.
import { prisma } from '../db.js'

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

export async function getDemoIssues() {
  const [wards, categories] = await Promise.all([
    prisma.ward.findMany({ orderBy: [{ lng: 'asc' }, { name: 'asc' }], select: { id: true, name: true, lat: true, lng: true } }),
    prisma.category.findMany({
      where: { name: { in: SCENARIOS.map(([name]) => name) } },
      include: { department: true },
    }),
  ])
  const byName = new Map(categories.map((category) => [category.name, category]))
  const size = Math.min(wards.length, 24)
  return Array.from({ length: size }, (_, index) => {
    const [name, priority, reportCount] = SCENARIOS[index % SCENARIOS.length]
    const category = byName.get(name)
    const ward = wards[Math.floor(index * wards.length / size)]
    const code = `DEMO-${String(index + 1).padStart(3, '0')}`
    return category && {
      id: code, code, lat: ward.lat, lng: ward.lng, ward, category, priority, reportCount,
      status: index % 8 === 0 ? 'CONFIRMED' : index % 8 === 3 ? 'RESOLVED' : 'OPEN',
    }
  }).filter(Boolean)
}

export function getDemoStats(issues) {
  const total = issues.reduce((sum, issue) => sum + issue.reportCount, 0)
  const resolved = issues.filter((issue) => issue.status !== 'OPEN').reduce((sum, issue) => sum + issue.reportCount, 0)
  const verified = issues.filter((issue) => issue.status === 'CONFIRMED').reduce((sum, issue) => sum + issue.reportCount, 0)
  return { total, verified, verifiedRate: resolved ? Math.round(100 * verified / resolved) : 0 }
}
