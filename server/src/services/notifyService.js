// Notifications: in-app records (always), live Socket.IO pushes (always) and
// optional real email via SMTP. With no SMTP configured every message is still
// recorded in-app and logged, so the demo never depends on external services.

import nodemailer from 'nodemailer'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { emitToRoom, emitToAll, rooms } from '../socket.js'
import { STATUS_LABELS } from '../lib/constants.js'

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  if (!env.mail.enabled || !env.mail.host) return null
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
  })
  return transporter
}

export async function sendEmail(to, subject, text) {
  if (!env.mail.enabled) {
    console.log(`[mail:disabled] -> ${to || '(no address)'} · ${subject}`)
    return null
  }
  try {
    const tx = getTransporter()
    const info = await tx.sendMail({ from: env.mail.from, to, subject, text })
    console.log(`[mail:sent] ${to} · ${subject}`)
    return info
  } catch (err) {
    console.warn(`[mail:error] ${err.message}`)
    return null
  }
}

export async function recordNotification({ userId, complaintId, channel = 'IN_APP', message }) {
  const notification = await prisma.notification.create({
    data: { userId: userId || null, complaintId: complaintId || null, channel, message },
  })
  if (userId) emitToRoom(rooms.user(userId), 'notification:new', notification)
  return notification
}

/** Push a complaint's new state to its timeline watchers, the dept queue and admins. */
export function broadcastComplaint(complaint, extra = {}) {
  const payload = {
    id: complaint.id,
    code: complaint.code,
    status: complaint.status,
    statusLabel: STATUS_LABELS[complaint.status] || complaint.status,
    escalationLevel: complaint.escalationLevel,
    priority: complaint.priority,
    updatedAt: complaint.updatedAt || new Date().toISOString(),
    ...extra,
  }
  emitToRoom(rooms.complaint(complaint.code), 'complaint:update', payload)
  if (complaint.departmentId) emitToRoom(rooms.officers(complaint.departmentId), 'queue:update', payload)
  emitToAll('admin:update', payload)
  return payload
}

/**
 * Notify a citizen (in-app + email) that their complaint changed state and push
 * the update live to anyone watching that complaint.
 */
export async function notifyStatusChange(complaint, { toStatus, note, actorName }) {
  const label = STATUS_LABELS[toStatus] || toStatus
  const message = `Complaint ${complaint.code}: ${label}${note ? ` — ${note}` : ''}`

  if (complaint.citizenId) {
    await recordNotification({ userId: complaint.citizenId, complaintId: complaint.id, message })
  }

  // Additional officer-facing notice whenever it escalates.
  if (complaint.escalationLevel > 0 && complaint.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: complaint.departmentId },
      select: { name: true, headUserId: true },
    })
    const escalationMessage = `ESCALATED (L${complaint.escalationLevel}) ${complaint.code} in ${dept?.name || 'department'} needs attention.`
    if (dept?.headUserId) {
      await recordNotification({ userId: dept.headUserId, complaintId: complaint.id, message: escalationMessage })
    }
    emitToRoom(rooms.officers(complaint.departmentId), 'escalation:new', {
      complaintId: complaint.id,
      code: complaint.code,
      level: complaint.escalationLevel,
      message: escalationMessage,
    })
  }

  broadcastComplaint(complaint, { note, actorName, message })
  return message
}

/** Immediate acknowledgement when a complaint is lodged. */
export async function notifyAcknowledgement(complaint, citizen) {
  const message = `Complaint ${complaint.code} received and routed. Track it any time with this ID.`
  if (citizen?.id) {
    await recordNotification({ userId: citizen.id, complaintId: complaint.id, message })
  }
  if (citizen?.email) {
    await sendEmail(citizen.email, `CivicResolve · ${complaint.code} received`, message)
  }
  broadcastComplaint(complaint, { message })
  return message
}
