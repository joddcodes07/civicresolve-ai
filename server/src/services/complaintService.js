// Complaint lifecycle orchestration: create (AI + duplicate + priority), status
// transitions (with the proof-of-fix gate), transfers, citizen feedback and +1 joins.

import { prisma } from '../db.js'
import { classifyComplaint } from './aiService.js'
import { resolveIssue } from './dupService.js'
import { getPriority } from './priorityService.js'
import { computeDueAt, hoursBetween, getEscalationLevel } from './slaService.js'
import { checkProofOfFix } from './proofService.js'
import { resolveWard } from '../lib/geo.js'
import { nextComplaintCode } from '../lib/ids.js'
import { notifyAcknowledgement, notifyStatusChange, broadcastComplaint } from './notifyService.js'

const OPEN = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'NEEDS_REVIEW']

async function pickOfficer(departmentId) {
  if (!departmentId) return null
  return prisma.user.findFirst({
    where: { role: 'OFFICER', departmentId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
}

/**
 * Lodge a complaint.
 * @param {{ text:string, lat:number, lng:number, photoUrl?:string, citizenId?:string,
 *           categoryIdOverride?:string, citizenName?:string }} input
 */
export async function createComplaint(input) {
  const { text, lat, lng, photoUrl = null, citizenId = null } = input
  const wards = await prisma.ward.findMany()
  const ward = resolveWard(lat, lng, wards)

  // 1. AI routing (LLM if configured, otherwise the local rules engine).
  let ai = await classifyComplaint(text, { includeMatched: true })

  // 2. Citizen correction wins over the AI's guess.
  if (input.categoryIdOverride && input.categoryIdOverride !== ai.categoryId) {
    const override = await prisma.category.findUnique({
      where: { id: input.categoryIdOverride },
      include: { department: true },
    })
    if (override) {
      ai = {
        ...ai,
        categoryId: override.id,
        categoryName: override.name,
        departmentId: override.department.id,
        departmentName: override.department.name,
        departmentCode: override.department.code,
        slaHours: override.department.slaHours,
        routingSource: 'manual',
      }
    }
  }

  // 3. Duplicate / issue grouping (F4).
  const category = await prisma.category.findUnique({ where: { id: ai.categoryId } })
  const issue = await resolveIssue({
    categoryId: ai.categoryId,
    lat,
    lng,
    wardId: ward?.id,
    text: ai.englishText || text,
    radiusMetres: category?.dupRadiusMetres ?? 50,
  })

  // 4. Priority (F1) + SLA deadline (F2).
  const priority = getPriority({
    severity: ai.severity,
    safetyRisk: ai.safetyRisk,
    reportCount: issue.reportCount,
    hoursPassed: 0,
    slaHours: ai.slaHours,
    reopened: false,
    nearSchoolOrHospital: ai.nearSchoolOrHospital,
  })

  const now = new Date()
  const dueAt = computeDueAt(now, ai.slaHours)
  const status = ai.needsReview ? 'NEEDS_REVIEW' : 'ASSIGNED'
  const officer = ai.needsReview ? null : await pickOfficer(ai.departmentId)
  const code = await nextComplaintCode()

  const complaint = await prisma.complaint.create({
    data: {
      code,
      originalText: text,
      englishText: ai.englishText,
      summary: ai.summary,
      language: ai.language,
      severity: ai.severity,
      safetyRisk: ai.safetyRisk,
      aiConfidence: ai.confidence,
      needsReview: ai.needsReview,
      routingSource: ai.routingSource,
      priority: priority.score,
      priorityReason: priority.reasonText,
      lat,
      lng,
      photoUrl,
      status,
      slaHours: ai.slaHours,
      dueAt,
      citizenId,
      officerId: officer?.id || null,
      categoryId: ai.categoryId,
      departmentId: ai.departmentId,
      wardId: ward?.id || null,
      issueId: issue.issueId,
    },
    include: { category: true, department: true, ward: true },
  })

  await prisma.issue.update({
    where: { id: issue.issueId },
    data: { priority: { set: Math.max(priority.score, 0) } },
  })

  await prisma.statusHistory.create({
    data: {
      complaintId: complaint.id,
      fromStatus: null,
      toStatus: status,
      note: ai.needsReview
        ? `Routed to ${ai.categoryName} but confidence was low — queued for manual review.`
        : `AI routed to ${ai.departmentName} · ${ai.categoryName}.`,
    },
  })

  const citizen = citizenId
    ? await prisma.user.findUnique({ where: { id: citizenId }, select: { id: true, email: true, name: true } })
    : null
  await notifyAcknowledgement(complaint, citizen)

  return { complaint, ai, priority, issue, ward }
}

/** Officer status update with the proof-of-fix gate on RESOLVED. */
export async function updateStatus({ complaintId, actor, toStatus, note, photoUrl, afterLat, afterLng }) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId }, include: { department: true } })
  if (!complaint) return { error: 'not_found' }
  if (actor.role === 'OFFICER' && complaint.departmentId && actor.departmentId !== complaint.departmentId) {
    return { error: 'forbidden' }
  }

  if (toStatus === 'RESOLVED') {
    const proof = checkProofOfFix({
      note,
      afterPhotoUrl: photoUrl,
      afterLat,
      afterLng,
      complaintLat: complaint.lat,
      complaintLng: complaint.lng,
    })
    if (!proof.ok) {
      return { error: 'proof_required', reasons: proof.reasons, distanceMetres: proof.distanceMetres }
    }
  }

  const hoursPassed = hoursBetween(complaint.createdAt)
  const priorityNow = getPriority({
    severity: complaint.severity,
    safetyRisk: complaint.safetyRisk,
    reportCount: await prisma.complaint.count({ where: { issueId: complaint.issueId } }),
    hoursPassed,
    slaHours: complaint.slaHours,
    reopened: complaint.reopened,
    nearSchoolOrHospital: false,
  })

  const data = {
    status: toStatus,
    priority: priorityNow.score,
    priorityReason: priorityNow.reasonText,
  }
  if (toStatus === 'RESOLVED') {
    data.resolvedAt = new Date()
    data.afterPhotoUrl = photoUrl || null
    data.confirmsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  }
  if (toStatus === 'CONFIRMED') data.status = 'CONFIRMED'

  const updated = await prisma.complaint.update({ where: { id: complaintId }, data })

  await prisma.statusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus,
      note: note || null,
      photoUrl: photoUrl || null,
      changedById: actor.id || null,
    },
  })

  // Resolve the parent issue if this complaint was the last open one.
  if (toStatus === 'RESOLVED' && complaint.issueId) {
    const stillOpen = await prisma.complaint.count({
      where: { issueId: complaint.issueId, status: { in: OPEN }, id: { not: complaintId } },
    })
    if (stillOpen === 0) {
      await prisma.issue.update({ where: { id: complaint.issueId }, data: { status: 'RESOLVED' } })
    }
  }

  await notifyStatusChange(updated, { toStatus, note, actorName: actor.name })
  return { complaint: updated }
}

export async function transferComplaint({ complaintId, actor, toDepartmentId, reason }) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } })
  if (!complaint) return { error: 'not_found' }
  const target = await prisma.department.findUnique({ where: { id: toDepartmentId } })
  if (!target) return { error: 'bad_department' }

  const officer = await pickOfficer(target.id)
  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { departmentId: target.id, officerId: officer?.id || null, status: 'ASSIGNED' },
  })

  await prisma.transfer.create({
    data: {
      complaintId,
      fromDeptId: complaint.departmentId || null,
      toDeptId: target.id,
      reason,
      officerId: actor.id || null,
    },
  })

  await prisma.statusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: 'ASSIGNED',
      note: `Transferred to ${target.name}: ${reason}`,
      changedById: actor.id || null,
    },
  })

  await notifyStatusChange(updated, { toStatus: 'ASSIGNED', note: `Transferred to ${target.name}`, actorName: actor.name })
  return { complaint: updated }
}

/** Citizen confirms the fix (→ CONFIRMED) or reopens it (→ REOPENED, +15 priority). */
export async function submitFeedback({ complaintId, citizenId, confirmed, rating, comment }) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } })
  if (!complaint) return { error: 'not_found' }
  if (complaint.citizenId && citizenId && complaint.citizenId !== citizenId) return { error: 'forbidden' }

  const toStatus = confirmed ? 'CONFIRMED' : 'REOPENED'
  const hoursPassed = hoursBetween(complaint.createdAt)
  const priority = getPriority({
    severity: complaint.severity,
    safetyRisk: complaint.safetyRisk,
    reportCount: 1,
    hoursPassed,
    slaHours: complaint.slaHours,
    reopened: !confirmed,
    nearSchoolOrHospital: false,
  })

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: toStatus,
      reopened: !confirmed,
      priority: priority.score,
      priorityReason: priority.reasonText,
    },
  })

  await prisma.feedback.upsert({
    where: { complaintId },
    create: { complaintId, confirmed, rating: rating || null, comment: comment || null },
    update: { confirmed, rating: rating || null, comment: comment || null },
  })

  await prisma.statusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus,
      note: confirmed ? 'Citizen confirmed the fix.' : 'Citizen reopened — fix not accepted.',
      changedById: citizenId || null,
    },
  })

  if (complaint.issueId && confirmed) {
    const stillOpen = await prisma.complaint.count({
      where: { issueId: complaint.issueId, status: { in: OPEN }, id: { not: complaintId } },
    })
    if (stillOpen === 0) {
      await prisma.issue.update({ where: { id: complaint.issueId }, data: { status: 'CONFIRMED' } })
    }
  }

  await notifyStatusChange(updated, {
    toStatus,
    note: confirmed ? 'Citizen confirmed the fix' : 'Citizen reopened the complaint',
    actorName: 'Citizen',
  })
  return { complaint: updated }
}

/** A citizen taps "+1 — I have this problem too" on an existing issue. */
export async function joinIssue({ issueId, citizenId, note }) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { category: true, ward: true } })
  if (!issue) return { error: 'not_found' }

  const anchor = await prisma.complaint.findFirst({
    where: { issueId },
    orderBy: { createdAt: 'asc' },
  })
  if (!anchor) return { error: 'not_found' }

  const updatedIssue = await prisma.issue.update({
    where: { id: issueId },
    data: { reportCount: { increment: 1 } },
  })

  const priority = getPriority({
    severity: anchor.severity,
    safetyRisk: anchor.safetyRisk,
    reportCount: updatedIssue.reportCount,
    hoursPassed: hoursBetween(anchor.createdAt),
    slaHours: anchor.slaHours,
    reopened: anchor.reopened,
    nearSchoolOrHospital: false,
  })

  const complaint = await prisma.complaint.create({
    data: {
      code: await nextComplaintCode(),
      originalText: note || `Joined existing issue ${issue.code}`,
      englishText: note || anchor.englishText,
      summary: note ? note.slice(0, 140) : anchor.summary,
      language: 'en',
      severity: anchor.severity,
      safetyRisk: anchor.safetyRisk,
      aiConfidence: 1,
      needsReview: false,
      routingSource: 'duplicate',
      priority: priority.score,
      priorityReason: priority.reasonText,
      lat: issue.lat,
      lng: issue.lng,
      status: 'ASSIGNED',
      slaHours: anchor.slaHours,
      dueAt: anchor.dueAt,
      citizenId: citizenId || null,
      officerId: anchor.officerId,
      categoryId: issue.categoryId,
      departmentId: anchor.departmentId,
      wardId: issue.wardId,
      issueId: issue.id,
    },
  })

  await prisma.statusHistory.create({
    data: {
      complaintId: complaint.id,
      fromStatus: null,
      toStatus: 'ASSIGNED',
      note: `Joined existing issue ${issue.code} (now ${updatedIssue.reportCount} reports).`,
      changedById: citizenId || null,
    },
  })

  await broadcastComplaint(complaint, { merged: true, issueCode: issue.code, reportCount: updatedIssue.reportCount })
  return { complaint, issue: updatedIssue }
}
