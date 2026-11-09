// Accountability metrics: F5 Verified Resolution Rate, F6 Department Performance
// Index, F7 AI routing accuracy — plus the aggregates behind the admin dashboard.
// All scoring maths lives in pure functions so it can be unit-tested.

import { prisma } from '../db.js'
import { DPI_WEIGHTS, CLOSED_STATUSES } from '../lib/constants.js'
import { hoursBetween } from './slaService.js'
import { priorityBand } from './priorityService.js'

// ---- pure formulas --------------------------------------------------------

export function computeVrr(confirmed = 0, reopened = 0) {
  const total = confirmed + reopened
  if (total === 0) return 0
  return (confirmed / total) * 100
}

export function computeDpiPct({ onTimePct = 0, vrrPct = 0, avgRating = 0 }) {
  return (
    DPI_WEIGHTS.onTime * onTimePct +
    DPI_WEIGHTS.vrr * vrrPct +
    DPI_WEIGHTS.rating * ((avgRating / 5) * 100)
  )
}

export function computeAccuracy(total = 0, transferred = 0) {
  if (total === 0) return 100
  return ((total - transferred) / total) * 100
}

export function dpiBand(score) {
  if (score >= 80) return 'good'
  if (score >= 60) return 'amber'
  return 'poor'
}

const round1 = (n) => Math.round(n * 10) / 10

/** Roll a department's complaints up into a scorecard row. */
export function summariseDepartment(name, complaints) {
  const total = complaints.length
  const open = complaints.filter((c) => !CLOSED_STATUSES.includes(c.status)).length
  const fixed = complaints.filter((c) => CLOSED_STATUSES.includes(c.status))
  const breached = complaints.filter(
    (c) => !CLOSED_STATUSES.includes(c.status) && new Date(c.dueAt) < new Date(),
  ).length

  const onTime = fixed.filter((c) => c.resolvedAt && new Date(c.resolvedAt) <= new Date(c.dueAt)).length
  const onTimePct = fixed.length ? (onTime / fixed.length) * 100 : 0

  const confirmed = complaints.filter((c) => c.status === 'CONFIRMED' || c.feedback?.confirmed === true).length
  const reopened = complaints.filter((c) => c.reopened || c.feedback?.confirmed === false).length
  const vrrPct = computeVrr(confirmed, reopened)

  const rated = complaints.map((c) => c.feedback?.rating).filter((r) => typeof r === 'number' && r > 0)
  const avgRating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0

  const dpi = computeDpiPct({ onTimePct, vrrPct, avgRating })

  return {
    name,
    total,
    open,
    fixed: fixed.length,
    breached,
    onTimePct: round1(onTimePct),
    vrr: round1(vrrPct),
    avgRating: round1(avgRating),
    dpi: round1(dpi),
    band: dpiBand(dpi),
  }
}

// ---- database-backed aggregates ------------------------------------------

const COMPLAINT_SELECT = {
  id: true,
  code: true,
  status: true,
  priority: true,
  dueAt: true,
  resolvedAt: true,
  reopened: true,
  createdAt: true,
  slaHours: true,
  escalationLevel: true,
  categoryId: true,
  departmentId: true,
  wardId: true,
  severity: true,
  safetyRisk: true,
  needsReview: true,
  routingSource: true,
  feedback: { select: { confirmed: true, rating: true } },
}

export async function getDepartmentScorecard() {
  const [departments, complaints] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.complaint.findMany({ select: COMPLAINT_SELECT }),
  ])

  return departments
    .map((d) => {
      const rows = complaints.filter((c) => c.departmentId === d.id)
      const row = summariseDepartment(d.name, rows)
      return { ...row, departmentId: d.id, code: d.code, slaHours: d.slaHours }
    })
    .sort((a, b) => b.dpi - a.dpi)
}

function weekKey(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

export async function getOverview() {
  const [complaints, categories, issues, totalComplaints] = await Promise.all([
    prisma.complaint.findMany({ select: COMPLAINT_SELECT }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.issue.findMany({ select: { id: true, reportCount: true } }),
    prisma.complaint.count(),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const open = complaints.filter((c) => !CLOSED_STATUSES.includes(c.status))
  const fixed = complaints.filter((c) => CLOSED_STATUSES.includes(c.status))
  const confirmed = complaints.filter((c) => c.status === 'CONFIRMED' || c.feedback?.confirmed === true)
  const reopened = complaints.filter((c) => c.reopened || c.feedback?.confirmed === false)
  const breached = open.filter((c) => new Date(c.dueAt) < now)
  const onTime = fixed.filter((c) => c.resolvedAt && new Date(c.resolvedAt) <= new Date(c.dueAt))
  const rated = complaints.map((c) => c.feedback?.rating).filter((r) => typeof r === 'number' && r > 0)
  const avgRating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0

  const transferredIds = new Set(
    (await prisma.transfer.findMany({ select: { complaintId: true } })).map((t) => t.complaintId),
  )
  const accuracy = computeAccuracy(totalComplaints, transferredIds.size)

  // Weekly trend (last 6 weeks) — lodged vs resolved.
  const weeks = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(start.getDate() - i * 7)
    weeks.push(weekKey(start))
  }
  const trend = weeks.map((key) => ({ week: key }))
  for (const c of complaints) {
    const k = weekKey(c.createdAt)
    const row = trend.find((t) => t.week === k)
    if (row) row.lodged = (row.lodged || 0) + 1
  }
  for (const c of fixed) {
    if (!c.resolvedAt) continue
    const k = weekKey(c.resolvedAt)
    const row = trend.find((t) => t.week === k)
    if (row) row.resolved = (row.resolved || 0) + 1
  }
  for (const row of trend) {
    row.lodged = row.lodged || 0
    row.resolved = row.resolved || 0
  }

  // Category breakdown.
  const catMap = new Map(categories.map((c) => [c.id, c.name]))
  const byCategory = new Map()
  for (const c of complaints) {
    const name = catMap.get(c.categoryId) || 'Uncategorised'
    if (!byCategory.has(name)) byCategory.set(name, { name, count: 0, open: 0 })
    const row = byCategory.get(name)
    row.count += 1
    if (!CLOSED_STATUSES.includes(c.status)) row.open += 1
  }
  const categoryBreakdown = [...byCategory.values()].sort((a, b) => b.count - a.count).slice(0, 8)

  return {
    kpis: {
      total: totalComplaints,
      open: open.length,
      breached: breached.length,
      resolvedThisMonth: fixed.filter((c) => c.resolvedAt && new Date(c.resolvedAt) >= monthStart).length,
      confirmed: confirmed.length,
      vrr: round1(computeVrr(confirmed.length, reopened.length)),
      onTimePct: round1(fixed.length ? (onTime.length / fixed.length) * 100 : 0),
      avgRating: round1(avgRating),
      aiAccuracy: round1(accuracy),
      needsReview: complaints.filter((c) => c.needsReview).length,
      mergedIssues: issues.filter((i) => i.reportCount > 1).length,
      duplicatesMerged: issues.reduce((sum, i) => sum + Math.max(0, i.reportCount - 1), 0),
      escalationsL1: complaints.filter((c) => c.escalationLevel === 1 && !CLOSED_STATUSES.includes(c.status)).length,
      escalationsL2: complaints.filter((c) => c.escalationLevel === 2 && !CLOSED_STATUSES.includes(c.status)).length,
    },
    trend,
    categoryBreakdown,
    // Priority distribution for the "where is the load" bar.
    priorityMix: ['urgent', 'high', 'normal', 'low'].map((band) => ({
      band,
      count: open.filter((c) => priorityBand(c.priority) === band).length,
    })),
    lastUpdated: new Date().toISOString(),
  }
}

export async function getAiAccuracy() {
  const [complaints, categories, transfers] = await Promise.all([
    prisma.complaint.findMany({ select: { id: true, categoryId: true, routingSource: true, needsReview: true, aiConfidence: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.transfer.findMany({ select: { complaintId: true, fromDeptId: true, toDeptId: true } }),
  ])

  const transferred = new Set(transfers.map((t) => t.complaintId))
  const catName = new Map(categories.map((c) => [c.id, c.name]))

  const perCategory = new Map()
  for (const c of complaints) {
    const name = catName.get(c.categoryId) || 'Uncategorised'
    if (!perCategory.has(name)) perCategory.set(name, { name, total: 0, transferred: 0 })
    const row = perCategory.get(name)
    row.total += 1
    if (transferred.has(c.id)) row.transferred += 1
  }

  const table = [...perCategory.values()]
    .map((r) => ({ ...r, accuracy: round1(computeAccuracy(r.total, r.transferred)) }))
    .sort((a, b) => a.accuracy - b.accuracy)

  const avgConfidence = complaints.length
    ? complaints.reduce((s, c) => s + (c.aiConfidence || 0), 0) / complaints.length
    : 0

  return {
    total: complaints.length,
    transferredToAnotherDept: transferred.size,
    accuracy: round1(computeAccuracy(complaints.length, transferred.size)),
    needsReview: complaints.filter((c) => c.needsReview).length,
    needsReviewRate: round1(complaints.length ? (complaints.filter((c) => c.needsReview).length / complaints.length) * 100 : 0),
    avgConfidence: round1(avgConfidence * 100) / 100,
    engine: complaints.filter((c) => c.routingSource === 'llm').length > 0 ? 'llm+rules' : 'rules',
    perCategory: table,
  }
}

export async function getHeatmap() {
  const [wards, complaints] = await Promise.all([
    prisma.ward.findMany(),
    prisma.complaint.findMany({
      where: { status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'NEEDS_REVIEW'] } },
      select: { wardId: true, priority: true, categoryId: true },
    }),
  ])
  return wards.map((w) => {
    const rows = complaints.filter((c) => c.wardId === w.id)
    const avgPriority = rows.length ? rows.reduce((s, c) => s + c.priority, 0) / rows.length : 0
    return {
      wardId: w.id,
      name: w.name,
      lat: w.lat,
      lng: w.lng,
      boundary: w.boundary,
      open: rows.length,
      avgPriority: round1(avgPriority),
      band: priorityBand(avgPriority),
    }
  })
}
