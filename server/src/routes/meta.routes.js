// Public reference data: departments, categories, wards, city config and the
// demo counters shown on the home page.
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/error.js'
import { CITY } from '../data/taxonomy.js'
import { getDemoIssues, getDemoStats } from '../data/demoIssues.js'
import { aiStatus } from '../services/aiService.js'

const router = Router()

router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const [departments, issues] = await Promise.all([
      prisma.department.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { categories: true } } },
      }),
      getDemoIssues(),
    ])
    const counts = new Map()
    for (const { category, reportCount } of issues) {
      counts.set(category.departmentId, (counts.get(category.departmentId) ?? 0) + reportCount)
    }
    res.json({
      departments: departments.map((d) => ({
        id: d.id, name: d.name, code: d.code, slaHours: d.slaHours,
        complaintCount: counts.get(d.id) ?? 0, categoryCount: d._count.categories,
      })),
    })
  }),
)

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { department: { select: { id: true, name: true, code: true, slaHours: true } } },
    })
    res.json({
      categories: categories.map((c) => ({
        id: c.id, name: c.name, subType: c.subType, defaultSeverity: c.defaultSeverity,
        dupRadiusMetres: c.dupRadiusMetres, department: c.department,
      })),
    })
  }),
)

router.get(
  '/wards',
  asyncHandler(async (_req, res) => {
    const wards = await prisma.ward.findMany({ orderBy: { name: 'asc' } })
    res.json({ wards: wards.map((w) => ({ id: w.id, name: w.name, lat: w.lat, lng: w.lng, boundary: w.boundary })) })
  }),
)

router.get('/data-provenance', asyncHandler(async (_req, res) => {
  const record = await prisma.setting.findUnique({ where: { key: 'referenceData' } })
  res.json({ provenance: record ? JSON.parse(record.value) : null })
}))

router.get('/city', (_req, res) => {
  res.json({ city: CITY, ai: aiStatus() })
})

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [samples, departments, wards] = await Promise.all([
      getDemoIssues(),
      prisma.department.count(),
      prisma.ward.count(),
    ])
    const demoStats = getDemoStats(samples)
    res.json({
      demoStats,
      stats: { ...demoStats, departments, wards, languages: 3, formulas: 7 },
    })
  }),
)

export default router
