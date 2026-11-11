// AI preview: the live "understanding card" the citizen sees while typing.
// Debounced on the client (~1.5s). Nothing is persisted here.
import multer from 'multer'
import { transcribeAudio } from '../services/voiceService.js'
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
    const ai = await classifyComplaint(text, { includeMatched: true, lat, lng })

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
        translationAvailable: ai.translationAvailable,
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

const audioUpload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['audio/webm', 'video/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/flac'])
    cb(allowed.has(file.mimetype) ? null : Object.assign(new Error('Use a supported audio format'), { status: 400 }), allowed.has(file.mimetype))
  },
})
router.post('/transcribe', requireAuth, audioUpload.single('audio'), validate(z.object({ language: z.enum(['en', 'hi', 'mr']).optional() })), asyncHandler(async (req, res) => {
  res.json(await transcribeAudio(req.file, req.body.language))
}))

export default router
