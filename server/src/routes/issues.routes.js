// Public issue map — grouped pins (one per Issue, with its merged report count).
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { serialiseIssue, serialiseComplaint } from '../lib/serialize.js'

const router = Router()

const VALID_STATUS = new Set(['OPEN', 'RESOLVED', 'CONFIRMED'])

router.get(
  '/map',
  asyncHandler(async (req, res) => {
    const { bbox, status, categoryId } = req.query
    const where = {}
    if (status && VALID_STATUS.has(String(status))) where.status = String(status)
    else where.status = { in: ['OPEN', 'RESOLVED'] }
    if (categoryId) where.categoryId = String(categoryId)

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = String(bbox).split(',').map(Number)
      if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
        where.lat = { gte: minLat, lte: maxLat }
        where.lng = { gte: minLng, lte: maxLng }
      }
    }

    const issues = await prisma.issue.findMany({
      where,
      include: { category: { include: { department: true } }, ward: true },
      orderBy: [{ reportCount: 'desc' }, { updatedAt: 'desc' }],
      take: 800,
    })
    res.json({ issues: issues.map(serialiseIssue) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: {
        category: { include: { department: true } },
        ward: true,
        complaints: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!issue) throw new HttpError(404, 'Issue not found')
    res.json({
      issue: serialiseIssue(issue),
      complaints: issue.complaints.map((c) => ({
        id: c.id, code: c.code, status: c.status, summary: c.summary, createdAt: c.createdAt,
      })),
    })
  }),
)

export default router
