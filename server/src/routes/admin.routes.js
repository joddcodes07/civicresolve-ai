// Admin / commissioner console: city overview, escalations, review queue,
// department scorecard, AI accuracy, heatmap and settings.
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { serialiseComplaint } from '../lib/serialize.js'
import { getOverview, getDepartmentScorecard, getAiAccuracy, getHeatmap } from '../services/metricsService.js'
import { getEscalationLevel } from '../services/slaService.js'
import { OPEN_STATUSES } from '../lib/constants.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))

const INCLUDE = {
  category: true, department: true, ward: true,
  officer: { select: { id: true, name: true } },
  citizen: { select: { id: true, name: true } },
  issue: true, feedback: true,
}

router.get('/overview', asyncHandler(async (_req, res) => res.json(await getOverview())))

router.get(
  '/complaints',
  asyncHandler(async (req, res) => {
    const { status, departmentId, wardId, q, page = '1' } = req.query
    const where = {}
    if (status === 'open') where.status = { in: OPEN_STATUSES }
    else if (status) where.status = status
    if (departmentId) where.departmentId = departmentId
    if (wardId) where.wardId = wardId
    if (q) where.OR = [{ code: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }]

    const pageNum = Math.max(1, Number(page) || 1)
    const size = 25
    const [rows, total] = await Promise.all([
      prisma.complaint.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: (pageNum - 1) * size, take: size }),
      prisma.complaint.count({ where }),
    ])
    res.json({
      complaints: rows.map((c) => serialiseComplaint(c)),
      page: pageNum, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)),
    })
  }),
)

router.get(
  '/escalations',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.complaint.findMany({
      where: { status: { in: OPEN_STATUSES }, escalationLevel: { gt: 0 } },
      include: INCLUDE,
      orderBy: [{ escalationLevel: 'desc' }, { priority: 'desc' }],
    })
    const data = rows.map((c) => {
      const s = serialiseComplaint(c)
      s.overdueHours = Math.round(Math.abs(s.sla.hoursLeft))
      return s
    })
    res.json({
      escalations: data,
      level1: data.filter((d) => d.escalationLevel === 1).length,
      level2: data.filter((d) => d.escalationLevel === 2).length,
    })
  }),
)

router.get(
  '/review',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.complaint.findMany({
      where: { needsReview: true, status: { in: ['NEEDS_REVIEW', ...OPEN_STATUSES] } },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ complaints: rows.map((c) => serialiseComplaint(c)) })
  }),
)

const assignSchema = z.object({ categoryId: z.string().min(1) })
router.post(
  '/review/:id/assign',
  validate(assignSchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.body.categoryId }, include: { department: true } })
    if (!category) throw new HttpError(400, 'Unknown category')

    const complaint = await prisma.complaint.findUnique({ where: { id: req.params.id } })
    if (!complaint) throw new HttpError(404, 'Complaint not found')

    const officer = await prisma.user.findFirst({
      where: { role: 'OFFICER', departmentId: category.departmentId },
      orderBy: { createdAt: 'asc' },
    })

    const updated = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        categoryId: category.id,
        departmentId: category.departmentId,
        slaHours: category.department.slaHours,
        needsReview: false,
        routingSource: 'manual',
        status: 'ASSIGNED',
        officerId: officer?.id || null,
      },
    })
    await prisma.statusHistory.create({
      data: {
        complaintId: complaint.id, fromStatus: complaint.status, toStatus: 'ASSIGNED',
        note: `Manually routed to ${category.department.name} · ${category.name} by admin.`,
        changedById: req.user.id,
      },
    })
    const full = await prisma.complaint.findUnique({ where: { id: updated.id }, include: INCLUDE })
    res.json({ complaint: serialiseComplaint(full, { history: true }) })
  }),
)

router.get('/departments', asyncHandler(async (_req, res) => res.json({ departments: await getDepartmentScorecard() })))

router.get('/ai-accuracy', asyncHandler(async (_req, res) => res.json(await getAiAccuracy())))

router.get('/heatmap', asyncHandler(async (_req, res) => res.json({ wards: await getHeatmap() })))

// ---- Settings (SLA hours, thresholds, DPI weights) ------------------------
const DEFAULT_SETTINGS = {
  confirmWindowDays: '7',
  similarityThreshold: '0.8',
  dpiWeightOnTime: '0.4',
  dpiWeightVrr: '0.4',
  dpiWeightRating: '0.2',
  autoAssign: 'true',
}

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany()
    const map = { ...DEFAULT_SETTINGS }
    for (const r of rows) map[r.key] = r.value
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true, slaHours: true } })
    res.json({ settings: map, departments })
  }),
)

const settingsSchema = z.object({
  settings: z.record(z.string(), z.string()).optional(),
  departmentSlas: z.array(z.object({ id: z.string(), slaHours: z.coerce.number().min(1).max(720) })).optional(),
})

router.put(
  '/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const ops = []
    for (const [key, value] of Object.entries(req.body.settings || {})) {
      ops.push(prisma.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }))
    }
    for (const d of req.body.departmentSlas || []) {
      ops.push(prisma.department.update({ where: { id: d.id }, data: { slaHours: d.slaHours } }))
    }
    await Promise.all(ops)
    res.json({ ok: true })
  }),
)

export default router
