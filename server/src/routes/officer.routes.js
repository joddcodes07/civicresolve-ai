// Officer console: priority-sorted queue, stats, reopened list, department map.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { serialiseComplaint } from '../lib/serialize.js'
import { OPEN_STATUSES, CLOSED_STATUSES } from '../lib/constants.js'

const router = Router()
router.use(requireAuth, requireRole('OFFICER', 'ADMIN'))

const INCLUDE = {
  category: true,
  department: true,
  ward: true,
  officer: { select: { id: true, name: true } },
  citizen: { select: { id: true, name: true } },
  issue: true,
  feedback: true,
}

const PAGE_SIZE = 20
const QUEUE_FILTERS = new Set([
  'open', 'urgent', 'high', 'safety', 'breached', 'needs_review', 'reopened', 'in_progress', 'resolved',
])

export function parseQueueQuery(query = {}) {
  const filter = query.filter ?? 'open'
  if (!QUEUE_FILTERS.has(filter)) throw new HttpError(400, 'Invalid queue filter')
  const page = Number(query.page ?? '1')
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Invalid page')
  return { filter, page }
}

function scopeFor(user, all) {
  if (user.role === 'ADMIN' || all === '1' || all === 'true') return {}
  return user.departmentId ? { departmentId: user.departmentId } : {}
}

router.get(
  '/queue',
  asyncHandler(async (req, res) => {
    const { filter, page } = parseQueueQuery(req.query)
    const { q, wardId, categoryId, all } = req.query
    const now = new Date()
    const scope = scopeFor(req.user, all)

    const where = { ...scope }
    if (filter === 'urgent') where.priority = { gte: 70 }
    else if (filter === 'high') where.priority = { gte: 40, lt: 70 }
    else if (filter === 'safety') where.safetyRisk = true
    else if (filter === 'breached') {
      where.status = { in: OPEN_STATUSES }
      where.dueAt = { lt: now }
    } else if (filter === 'needs_review') where.needsReview = true
    else if (filter === 'reopened') where.status = 'REOPENED'
    else if (filter === 'in_progress') where.status = 'IN_PROGRESS'
    else if (filter === 'resolved') where.status = { in: CLOSED_STATUSES }
    else where.status = { in: OPEN_STATUSES }

    if (wardId) where.wardId = wardId
    if (categoryId) where.categoryId = categoryId
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { originalText: { contains: q, mode: 'insensitive' } },
        { englishText: { contains: q, mode: 'insensitive' } },
      ]
    }

    const pageNum = page
    const [rows, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        skip: (pageNum - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.complaint.count({ where }),
    ])

    res.json({
      complaints: rows.map((c) => serialiseComplaint(c)),
      page: pageNum,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  }),
)

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req.user, req.query.all)
    const now = new Date()
    const [open, breached, resolved, confirmedAll, reopened, avgRow] = await Promise.all([
      prisma.complaint.count({ where: { ...scope, status: { in: OPEN_STATUSES } } }),
      prisma.complaint.count({ where: { ...scope, status: { in: OPEN_STATUSES }, dueAt: { lt: now } } }),
      prisma.complaint.count({ where: { ...scope, status: { in: CLOSED_STATUSES } } }),
      prisma.complaint.count({ where: { ...scope, status: 'CONFIRMED' } }),
      prisma.complaint.count({ where: { ...scope, reopened: true } }),
      prisma.complaint.findMany({ where: { ...scope, resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true }, take: 200 }),
    ])

    const avgHours = avgRow.length
      ? avgRow.reduce((s, c) => s + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3600000, 0) / avgRow.length
      : 0
    const confirmed = await prisma.complaint.count({ where: { ...scope, status: 'CONFIRMED' } })
    const vrr = confirmed + reopened > 0 ? (confirmed / (confirmed + reopened)) * 100 : 0

    res.json({
      stats: {
        open, breached, resolved,
        confirmed: confirmedAll,
        reopened,
        avgResolutionHours: Math.round(avgHours),
        verifiedResolutionRate: Math.round(vrr),
      },
    })
  }),
)

router.get(
  '/reopened',
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req.user, req.query.all)
    const rows = await prisma.complaint.findMany({
      where: { ...scope, status: 'REOPENED' },
      include: INCLUDE,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    })
    res.json({ complaints: rows.map((c) => serialiseComplaint(c)) })
  }),
)

router.get(
  '/map',
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req.user, req.query.all)
    const rows = await prisma.complaint.findMany({
      where: { ...scope, status: { in: OPEN_STATUSES } },
      include: INCLUDE,
      orderBy: { priority: 'desc' },
      take: 400,
    })
    res.json({ complaints: rows.map((c) => serialiseComplaint(c)) })
  }),
)

export default router
