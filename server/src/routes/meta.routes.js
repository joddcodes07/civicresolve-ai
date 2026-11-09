// Public reference data: departments, categories, wards, city config and the
// live counters shown on the home page.
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/error.js'
import { CITY } from '../data/taxonomy.js'
import { aiStatus } from '../services/aiService.js'
import { CLOSED_STATUSES } from '../lib/constants.js'

const router = Router()

router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { complaints: true, categories: true } } },
    })
    res.json({
      departments: departments.map((d) => ({
        id: d.id, name: d.name, code: d.code, slaHours: d.slaHours,
        complaintCount: d._count.complaints, categoryCount: d._count.categories,
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

router.get('/city', (_req, res) => {
  res.json({ city: CITY, ai: aiStatus() })
})

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [total, resolvedOrConfirmed, departments, wards, openCount, issues] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: { in: CLOSED_STATUSES } } }),
      prisma.department.count(),
      prisma.ward.count(),
      prisma.complaint.count({ where: { status: { notIn: CLOSED_STATUSES } } }),
      prisma.issue.count(),
    ])
    const verified = await prisma.complaint.count({ where: { status: 'CONFIRMED' } })
    res.json({
      stats: {
        total,
        resolved: resolvedOrConfirmed,
        verified,
        open: openCount,
        departments,
        wards,
        issues,
        verifiedRate: resolvedOrConfirmed ? Math.round((verified / resolvedOrConfirmed) * 100) : 0,
      },
    })
  }),
)

export default router
