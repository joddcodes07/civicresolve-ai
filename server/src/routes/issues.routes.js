// The public showcase uses fictional issues. Operational reports have their own routes.
import { Router } from 'express'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { serialiseIssue } from '../lib/serialize.js'
import { getDemoIssues } from '../data/demoIssues.js'

const router = Router()
const VALID_STATUS = new Set(['OPEN', 'RESOLVED', 'CONFIRMED'])
const PRIORITY_RANGES = new Map([['urgent', [70, 101]], ['high', [40, 70]], ['normal', [0, 40]]])

function publicIssue(issue) {
  return { ...serialiseIssue(issue), demo: true }
}

router.get('/map', asyncHandler(async (req, res) => {
  const { bbox, status, categoryId, departmentId, wardId, priority, limit } = req.query
  if (status && !VALID_STATUS.has(status)) throw new HttpError(400, 'Invalid status filter')
  if (priority && !PRIORITY_RANGES.has(priority)) throw new HttpError(400, 'Invalid priority filter')
  const [minPriority, maxPriority] = PRIORITY_RANGES.get(priority) ?? [0, 101]
  const bounds = bbox ? String(bbox).split(',').map(Number) : [-180, -90, 180, 90]
  const [west, south, east, north] = bounds
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || west < -180 || south < -90 || east > 180 || north > 90 || west > east || south > north) {
    throw new HttpError(400, 'Invalid map bounds')
  }
  const count = limit === undefined ? Infinity : Number(limit)
  if (limit !== undefined && (!Number.isInteger(count) || count < 1)) throw new HttpError(400, 'Invalid map limit')

  const matching = (await getDemoIssues()).filter((issue) =>
    (status ? issue.status === status : issue.status !== 'CONFIRMED') &&
    (!categoryId || issue.category.id === categoryId) &&
    (!departmentId || issue.category.departmentId === departmentId) &&
    (!wardId || issue.ward.id === wardId) &&
    issue.priority >= minPriority && issue.priority < maxPriority &&
    issue.lat >= south && issue.lat <= north && issue.lng >= west && issue.lng <= east,
  )
  const issues = matching.slice(0, count)
  res.json({
    demo: true,
    issues: issues.map(publicIssue),
    heatmap: issues.map(({ lat, lng, reportCount, priority }) => ({ lat, lng, weight: reportCount, priority, demo: true })),
    truncated: issues.length < matching.length,
  })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  if (!/^DEMO-\d{4}$/.test(req.params.id)) throw new HttpError(404, 'Issue not found')
  const issue = (await getDemoIssues()).find((issue) => issue.id === req.params.id)
  if (!issue) throw new HttpError(404, 'Issue not found')
  res.json({ issue: publicIssue(issue), complaints: [] })
}))

export default router
