// Citizen + public complaint endpoints, plus officer status/transfer actions.
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { upload, publicUrl } from '../middleware/upload.js'
import { complaintLimiter } from '../middleware/rateLimit.js'
import { serialiseComplaint } from '../lib/serialize.js'
import { classifyComplaint } from '../services/aiService.js'
import { findDuplicateCandidate } from '../services/dupService.js'
import { createComplaint, updateStatus, transferComplaint, submitFeedback, joinIssue } from '../services/complaintService.js'
import { broadcastComplaint } from '../services/notifyService.js'

const router = Router()

const DETAIL_INCLUDE = {
  category: true,
  department: true,
  ward: true,
  officer: { select: { id: true, name: true } },
  citizen: { select: { id: true, name: true } },
  issue: true,
  feedback: true,
}

// ---- Lodge a complaint ----------------------------------------------------
router.post(
  '/',
  optionalAuth,
  complaintLimiter,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const text = String(req.body.text || '').trim()
    const lat = Number(req.body.lat)
    const lng = Number(req.body.lng)
    const categoryIdOverride = req.body.categoryId ? String(req.body.categoryId) : undefined

    if (text.length < 10) throw new HttpError(400, 'Please describe the problem in at least 10 characters.')
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'A location (lat/lng) is required.')

    const result = await createComplaint({
      text,
      lat,
      lng,
      photoUrl: publicUrl(req.file),
      citizenId: req.user?.id || null,
      categoryIdOverride,
    })

    const full = await prisma.complaint.findUnique({ where: { id: result.complaint.id }, include: DETAIL_INCLUDE })
    res.status(201).json({
      complaint: serialiseComplaint(full, { history: true }),
      ai: result.ai,
      priority: result.priority,
      issue: result.issue,
    })
  }),
)

// ---- Public tracking (no personal data) ----------------------------------
router.get(
  '/track/:code',
  asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: {
        ...DETAIL_INCLUDE,
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } },
      },
    })
    if (!complaint) throw new HttpError(404, `No complaint found with ID ${req.params.code}.`)
    // Public view hides the officer/citizen identities.
    const payload = serialiseComplaint(complaint, { history: true, messages: true })
    payload.officer = complaint.officer ? { name: complaint.officer.name } : null
    payload.citizen = null
    res.json({ complaint: payload })
  }),
)

// ---- My complaints --------------------------------------------------------
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const complaints = await prisma.complaint.findMany({
      where: { citizenId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: DETAIL_INCLUDE,
    })
    res.json({ complaints: complaints.map((c) => serialiseComplaint(c)) })
  }),
)

const dupQuery = z.object({
  text: z.string().trim().min(4),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  categoryId: z.string().optional(),
})

// ---- "Already reported?" duplicate check ---------------------------------
router.get(
  '/duplicates',
  optionalAuth,
  validate(dupQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { text, lat, lng, categoryId } = req.query
    const ai = await classifyComplaint(text)
    const resolvedCategoryId = categoryId || ai.categoryId
    const category = await prisma.category.findUnique({ where: { id: resolvedCategoryId } })
    const match = await findDuplicateCandidate({
      categoryId: resolvedCategoryId,
      lat,
      lng,
      text: ai.englishText || text,
      radiusMetres: category?.dupRadiusMetres ?? 50,
    })
    if (!match) return res.json({ duplicate: null })
    res.json({
      duplicate: {
        complaintId: match.id,
        complaintCode: match.code,
        issueId: match.issueId,
        distanceMetres: Math.round(match.distanceMetres),
        similarity: Number(match.similarity.toFixed(3)),
        categoryName: ai.categoryName,
      },
    })
  }),
)

// ---- Officer/admin: full complaint by id ---------------------------------
router.get(
  '/:id',
  requireAuth,
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: {
        ...DETAIL_INCLUDE,
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } },
        transfers: { orderBy: { createdAt: 'desc' }, include: { toDept: true, fromDept: true } },
      },
    })
    if (!complaint) throw new HttpError(404, 'Complaint not found')
    if (req.user.role === 'OFFICER' && complaint.departmentId && req.user.departmentId !== complaint.departmentId) {
      throw new HttpError(403, 'This complaint is outside your department')
    }
    const payload = serialiseComplaint(complaint, { history: true, messages: true })
    payload.transfers = (complaint.transfers || []).map((t) => ({
      id: t.id,
      from: t.fromDept?.name || null,
      to: t.toDept?.name || null,
      reason: t.reason,
      createdAt: t.createdAt,
    }))
    res.json({ complaint: payload })
  }),
)

// ---- +1 an existing issue -------------------------------------------------
const joinSchema = z.object({ issueId: z.string().min(1), note: z.string().max(500).optional() })
router.post(
  '/join',
  requireAuth,
  validate(joinSchema),
  asyncHandler(async (req, res) => {
    const result = await joinIssue({ issueId: req.body.issueId, citizenId: req.user.id, note: req.body.note })
    if (result.error) throw new HttpError(404, 'That issue is no longer available.')
    const full = await prisma.complaint.findUnique({ where: { id: result.complaint.id }, include: DETAIL_INCLUDE })
    res.status(201).json({ complaint: serialiseComplaint(full, { history: true }) })
  }),
)

// ---- Citizen confirm / reopen --------------------------------------------
const feedbackSchema = z.object({
  confirmed: z.boolean(),
  rating: z.coerce.number().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
})
router.post(
  '/:id/feedback',
  requireAuth,
  validate(feedbackSchema),
  asyncHandler(async (req, res) => {
    const result = await submitFeedback({
      complaintId: req.params.id,
      citizenId: req.user.id,
      confirmed: req.body.confirmed,
      rating: req.body.rating,
      comment: req.body.comment,
    })
    if (result.error === 'not_found') throw new HttpError(404, 'Complaint not found')
    if (result.error === 'forbidden') throw new HttpError(403, 'This is not your complaint')
    res.json({ complaint: serialiseComplaint(result.complaint) })
  }),
)

// ---- Lifecycle conversation ----------------------------------------------
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const messages = await prisma.message.findMany({
      where: { complaintId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { name: true } } },
    })
    res.json({
      messages: messages.map((m) => ({
        id: m.id, senderRole: m.senderRole, senderName: m.senderName || m.sender?.name || null,
        body: m.body, createdAt: m.createdAt,
      })),
    })
  }),
)

const messageSchema = z.object({ body: z.string().trim().min(1).max(1000), senderRole: z.enum(['CITIZEN', 'OFFICER', 'ADMIN']).optional() })
router.post(
  '/:id/messages',
  requireAuth,
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findUnique({ where: { id: req.params.id }, select: { id: true, code: true, departmentId: true } })
    if (!complaint) throw new HttpError(404, 'Complaint not found')
    const role = req.user.role === 'CITIZEN' ? 'CITIZEN' : req.user.role === 'ADMIN' ? 'ADMIN' : 'OFFICER'
    const message = await prisma.message.create({
      data: { complaintId: complaint.id, senderRole: role, senderId: req.user.id, senderName: req.user.name, body: req.body.body },
    })
    const { emitToRoom, rooms } = await import('../socket.js')
    emitToRoom(rooms.complaint(complaint.code), 'message:new', {
      id: message.id, senderRole: message.senderRole, senderName: message.senderName,
      body: message.body, createdAt: message.createdAt,
    })
    res.status(201).json({ message })
  }),
)

// ---- Officer: upload an after-photo (returns its URL) --------------------
router.post(
  '/:id/photo',
  requireAuth,
  requireRole('OFFICER', 'ADMIN'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No photo received')
    res.status(201).json({ url: publicUrl(req.file) })
  }),
)

// ---- Officer: status update (proof-of-fix gate) ---------------------------
const statusSchema = z.object({
  toStatus: z.enum(['ASSIGNED', 'IN_PROGRESS', 'RESOLVED']),
  note: z.string().max(1000).optional(),
  photoUrl: z.string().optional(),
  afterLat: z.coerce.number().optional(),
  afterLng: z.coerce.number().optional(),
})
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('OFFICER', 'ADMIN'),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const result = await updateStatus({
      complaintId: req.params.id,
      actor: req.user,
      toStatus: req.body.toStatus,
      note: req.body.note,
      photoUrl: req.body.photoUrl,
      afterLat: req.body.afterLat,
      afterLng: req.body.afterLng,
    })
    if (result.error === 'not_found') throw new HttpError(404, 'Complaint not found')
    if (result.error === 'forbidden') throw new HttpError(403, 'This complaint is outside your department')
    if (result.error === 'proof_required') {
      throw new HttpError(422, 'Proof of fix required', { reasons: result.reasons, code: 'proof_required' })
    }
    const full = await prisma.complaint.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE })
    res.json({ complaint: serialiseComplaint(full, { history: true }) })
  }),
)

// ---- Officer: transfer to the right department ---------------------------
const transferSchema = z.object({ toDepartmentId: z.string().min(1), reason: z.string().trim().min(5).max(500) })
router.post(
  '/:id/transfer',
  requireAuth,
  requireRole('OFFICER', 'ADMIN'),
  validate(transferSchema),
  asyncHandler(async (req, res) => {
    const result = await transferComplaint({
      complaintId: req.params.id,
      actor: req.user,
      toDepartmentId: req.body.toDepartmentId,
      reason: req.body.reason,
    })
    if (result.error === 'not_found') throw new HttpError(404, 'Complaint not found')
    if (result.error === 'bad_department') throw new HttpError(400, 'Unknown department')
    broadcastComplaint(result.complaint)
    const full = await prisma.complaint.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE })
    res.json({ complaint: serialiseComplaint(full, { history: true }) })
  }),
)

export default router
