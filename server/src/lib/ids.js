// Human-readable identifier generators: CR-2026-004512 and ISS-1187.

import { prisma } from '../db.js'

export async function nextComplaintCode(client = prisma) {
  const year = new Date().getFullYear()
  const count = await client.complaint.count()
  for (let i = 1; i <= 200; i++) {
    const candidate = `CR-${year}-${String(count + i).padStart(6, '0')}`
    const exists = await client.complaint.findUnique({ where: { code: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `CR-${year}-${String(Date.now()).slice(-6)}`
}

export async function nextIssueCode(client = prisma) {
  const count = await client.issue.count()
  for (let i = 1; i <= 200; i++) {
    const candidate = `ISS-${String(count + i).padStart(4, '0')}`
    const exists = await client.issue.findUnique({ where: { code: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `ISS-${String(Date.now()).slice(-4)}`
}

export function slaDueDate(from, slaHours) {
  return new Date(new Date(from).getTime() + slaHours * 3600 * 1000)
}
