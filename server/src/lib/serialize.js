// One place that turns Prisma rows into the JSON shape the client expects.
import { STATUS_LABELS } from './constants.js'
import { getSlaStatus, getEscalationLevel, ESCALATION_LABELS } from '../services/slaService.js'
import { priorityBand } from '../services/priorityService.js'

const person = (u) => (u ? { id: u.id, name: u.name, email: u.email ?? undefined } : null)

export function serialiseComplaint(c, opts = {}) {
  if (!c) return null
  const sla = getSlaStatus(c.createdAt, c.slaHours)
  const escalationLevel = c.escalationLevel ?? 0

  return {
    id: c.id,
    code: c.code,
    status: c.status,
    statusLabel: STATUS_LABELS[c.status] || c.status,
    originalText: c.originalText,
    englishText: c.englishText,
    summary: c.summary,
    language: c.language,
    severity: c.severity,
    safetyRisk: c.safetyRisk,
    aiConfidence: c.aiConfidence,
    needsReview: c.needsReview,
    routingSource: c.routingSource,
    priority: c.priority,
    priorityBand: priorityBand(c.priority),
    priorityReason: c.priorityReason,
    lat: c.lat,
    lng: c.lng,
    photoUrl: c.photoUrl,
    afterPhotoUrl: c.afterPhotoUrl,
    category: c.category ? { id: c.category.id, name: c.category.name } : null,
    department: c.department
      ? { id: c.department.id, name: c.department.name, code: c.department.code, slaHours: c.department.slaHours }
      : null,
    ward: c.ward ? { id: c.ward.id, name: c.ward.name } : null,
    issue: c.issue ? { id: c.issue.id, code: c.issue.code, reportCount: c.issue.reportCount, status: c.issue.status } : null,
    reportCount: c.issue?.reportCount ?? 1,
    officer: person(c.officer),
    citizen: person(c.citizen),
    slaHours: c.slaHours,
    dueAt: sla.dueAt,
    sla: {
      hoursLeft: Math.round(sla.hoursLeft),
      hoursPassed: Math.round(sla.hoursPassed),
      usedPct: Math.round(sla.usedPct),
      colour: sla.colour,
      breached: sla.breached,
      label: sla.label,
    },
    escalationLevel,
    escalationLabel: ESCALATION_LABELS[escalationLevel] || ESCALATION_LABELS[0],
    reopened: c.reopened,
    feedback: c.feedback
      ? { confirmed: c.feedback.confirmed, rating: c.feedback.rating, comment: c.feedback.comment, createdAt: c.feedback.createdAt }
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    resolvedAt: c.resolvedAt,
    confirmsAt: c.confirmsAt,
    history: opts.history
      ? (c.statusHistory || []).map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          statusLabel: STATUS_LABELS[h.toStatus] || h.toStatus,
          note: h.note,
          photoUrl: h.photoUrl,
          changedBy: h.changedBy?.name || null,
          createdAt: h.createdAt,
        }))
      : undefined,
    messages: opts.messages
      ? (c.messages || []).map((m) => ({
          id: m.id, senderRole: m.senderRole, senderName: m.senderName || m.sender?.name || null,
          body: m.body, createdAt: m.createdAt,
        }))
      : undefined,
  }
}

export function serialiseIssue(i) {
  if (!i) return null
  return {
    id: i.id,
    code: i.code,
    lat: i.lat,
    lng: i.lng,
    reportCount: i.reportCount,
    priority: i.priority,
    priorityBand: priorityBand(i.priority),
    status: i.status,
    category: i.category ? { id: i.category.id, name: i.category.name } : null,
    department: i.category?.department ? { id: i.category.department.id, name: i.category.department.name } : null,
    ward: i.ward ? { id: i.ward.id, name: i.ward.name } : null,
    createdAt: i.createdAt,
  }
}

export { person }
