// SLA watchdog — runs every 15 minutes (configurable).
//   1. Escalates late complaints (F3): L1 dept head, L2 commissioner.
//   2. Auto-confirms complaints resolved more than 7 days ago with no reply,
//      so files never stay open forever.
import cron from 'node-cron'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { getEscalationLevel, hoursBetween } from '../services/slaService.js'
import { notifyStatusChange } from '../services/notifyService.js'
import { OPEN_STATUSES, CONFIRM_WINDOW_DAYS } from '../lib/constants.js'

export async function runSlaSweep() {
  const now = new Date()
  let escalated = 0
  let autoConfirmed = 0

  const open = await prisma.complaint.findMany({
    where: { status: { in: OPEN_STATUSES } },
    select: { id: true, code: true, createdAt: true, slaHours: true, escalationLevel: true, status: true, citizenId: true, departmentId: true },
  })

  for (const c of open) {
    const level = getEscalationLevel(hoursBetween(c.createdAt, now), c.slaHours)
    if (level > c.escalationLevel) {
      const updated = await prisma.complaint.update({
        where: { id: c.id },
        data: { escalationLevel: level },
      })
      await prisma.statusHistory.create({
        data: {
          complaintId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          note: `Auto-escalated to Level ${level} (${level === 1 ? 'department head' : 'commissioner'}) — SLA breached.`,
        },
      })
      await notifyStatusChange(updated, {
        toStatus: updated.status,
        note: `Auto-escalated to Level ${level}`,
        actorName: 'SLA watchdog',
      })
      escalated += 1
    }
  }

  const stale = await prisma.complaint.findMany({
    where: { status: 'RESOLVED', confirmsAt: { lt: now } },
    select: { id: true, code: true, status: true, citizenId: true, departmentId: true },
  })
  for (const c of stale) {
    const updated = await prisma.complaint.update({ where: { id: c.id }, data: { status: 'CONFIRMED' } })
    await prisma.statusHistory.create({
      data: {
        complaintId: c.id,
        fromStatus: 'RESOLVED',
        toStatus: 'CONFIRMED',
        note: `Auto-confirmed after ${CONFIRM_WINDOW_DAYS} days with no citizen response.`,
      },
    })
    await notifyStatusChange(updated, { toStatus: 'CONFIRMED', note: 'Auto-confirmed (no response)', actorName: 'SLA watchdog' })
    autoConfirmed += 1
  }

  if (escalated || autoConfirmed) {
    console.log(`[sla] swept ${open.length} open · escalated ${escalated} · auto-confirmed ${autoConfirmed}`)
  }
  return { escalated, autoConfirmed, checked: open.length }
}

export function startSlaCron() {
  if (!env.sla.enabled) {
    console.log('[sla] watchdog disabled (SLA_CRON_ENABLED=false)')
    return null
  }
  const task = cron.schedule(env.sla.schedule, () => {
    runSlaSweep().catch((err) => console.error('[sla] sweep failed:', err.message))
  })
  console.log(`[sla] watchdog scheduled (${env.sla.schedule})`)
  return task
}
