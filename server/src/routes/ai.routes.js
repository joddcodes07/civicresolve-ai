// AI preview: the live "understanding card" the citizen sees while typing.
// Debounced on the client (~1.5s). Nothing is persisted here.
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { validate } from '../middleware/validate.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { classifyComplaint, aiStatus } from '../services/aiService.js'
import { getPriority } from '../services/priorityService.js'
import { computeDueAt, getSlaStatus } from '../services/slaService.js'
import { findDuplicateCandidate } from '../services/dupService.js'
import { resolveWard } from '../lib/geo.js'

const router = Router()

const previewSchema = z.object({
  text: z.string().trim().min(4, 'Describe the problem in a few words').max(2000),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
})

router.post(
  '/preview',
  optionalAuth,
  validate(previewSchema),
  asyncHandler(async (req, res) => {
    const { text, lat, lng } = req.body
    const ai = await classifyComplaint(text, { includeMatched: true })

    const now = new Date()
    const priority = getPriority({
      severity: ai.severity,
      safetyRisk: ai.safetyRisk,
      reportCount: 1,
      hoursPassed: 0,
      slaHours: ai.slaHours,
      reopened: false,
      nearSchoolOrHospital: ai.nearSchoolOrHospital,
    })
    const sla = getSlaStatus(now, ai.slaHours, now)

    let duplicate = null
    let ward = null
    if (typeof lat === 'number' && typeof lng === 'number') {
      ward = resolveWard(lat, lng, await prisma.ward.findMany())
      const category = await prisma.category.findUnique({ where: { id: ai.categoryId } })
      const match = await findDuplicateCandidate({
        categoryId: ai.categoryId,
        lat,
        lng,
        text: ai.englishText || text,
        radiusMetres: category?.dupRadiusMetres ?? 50,
      })
      if (match) {
        duplicate = {
          complaintCode: match.code,
          issueId: match.issueId,
          distanceMetres: Math.round(match.distanceMetres),
          similarity: Number(match.similarity.toFixed(3)),
        }
      }
    }

    res.json({
      ai: {
        categoryId: ai.categoryId,
        categoryName: ai.categoryName,
        departmentId: ai.departmentId,
        departmentName: ai.departmentName,
        departmentCode: ai.departmentCode,
        severity: ai.severity,
        safetyRisk: ai.safetyRisk,
        nearSchoolOrHospital: ai.nearSchoolOrHospital,
        confidence: ai.confidence,
        needsReview: ai.needsReview,
        language: ai.language,
        englishText: ai.englishText,
        summary: ai.summary,
        routingSource: ai.routingSource,
        slaHours: ai.slaHours,
      },
      priority: { score: priority.score, band: priority.band, reasons: priority.reasons, reasonText: priority.reasonText },
      deadline: { dueAt: computeDueAt(now, ai.slaHours), slaHours: ai.slaHours, colour: sla.colour },
      duplicate,
      ward: ward ? { id: ward.id, name: ward.name } : null,
    })
  }),
)

router.get('/status', requireAuth, (_req, res) => res.json({ status: aiStatus() }))

export default router
