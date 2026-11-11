// Import only a reviewed, permissioned JSON export. No users are fabricated.
// Input: {sourceUrl, permission, complaints:[{sourceId,text,lat,lng,createdAt,citizenEmail,photoUrl?}]}
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../src/db.js'
import { classifyComplaint } from '../src/services/aiService.js'
import { validatePuneLocation } from '../src/services/submissionService.js'
import { getPriority } from '../src/services/priorityService.js'
import { computeDueAt } from '../src/services/slaService.js'
import { resolveWard } from '../src/lib/geo.js'
const schema = z.object({
  sourceUrl: z.string().url(), permission: z.string().min(10),
  complaints: z.array(z.object({
    sourceId: z.string().min(1).max(100), text: z.string().trim().min(10).max(2000),
    lat: z.number(), lng: z.number(), createdAt: z.string().datetime(),
    citizenEmail: z.string().email(), photoUrl: z.string().regex(/^\/uploads\/[a-zA-Z0-9.-]+$/).optional(),
  })).min(1).max(1000),
})
try {
  if (!process.argv[2]) throw new Error('Pass a reviewed complaint export JSON file path; see docs/DHRUV_HANDOFF.md')
  const input = schema.parse(JSON.parse(await fs.readFile(process.argv[2], 'utf8')))
  const wards = await prisma.ward.findMany()
  const prepared = []
  for (const row of input.complaints) {
    await validatePuneLocation(row.lat, row.lng)
    if (new Date(row.createdAt) > new Date()) throw new Error('Complaint timestamps cannot be in the future')
    const citizen = await prisma.user.findUnique({ where: { email: row.citizenEmail.toLowerCase() } })
    if (!citizen || citizen.role !== 'CITIZEN') throw new Error('Each complaint must belong to an existing citizen account')
    if (row.photoUrl) {
      const stat = await fs.stat(new URL(`../uploads/${row.photoUrl.split('/').pop()}`, import.meta.url))
      if (stat.size > 5 * 1024 * 1024) throw new Error('Photo exceeds 5 MB')
    }
    const ai = await classifyComplaint(row.text, { lat: row.lat, lng: row.lng })
    if (!ai.categoryId || !ai.departmentId) throw new Error('Import the reference taxonomy first')
    const priority = getPriority({ severity: ai.severity, safetyRisk: ai.safetyRisk, nearSchoolOrHospital: ai.nearSchoolOrHospital, slaHours: ai.slaHours })
    const digest = createHash('sha256').update(`${input.sourceUrl}:${row.sourceId}`).digest('hex').slice(0, 24).toUpperCase()
    prepared.push({ row, citizen, ai, priority, ward: resolveWard(row.lat, row.lng, wards), code: `CR-IMPORT-${digest}` })
  }
  // Full validation before any inserts. Re-import does not overwrite records.
  let imported = 0
  await prisma.$transaction(async tx => {
    for (const { row, citizen, ai, priority, ward, code } of prepared) {
      if (await tx.complaint.findUnique({ where: { code } })) continue
      const issue = await tx.issue.create({ data: { code: `ISS-${code}`, lat: row.lat, lng: row.lng, categoryId: ai.categoryId, wardId: ward?.id, priority: priority.score } })
      const c = await tx.complaint.create({ data: {
        code, originalText: row.text, englishText: ai.englishText, language: ai.language, summary: ai.summary,
        lat: row.lat, lng: row.lng, citizenId: citizen.id, photoUrl: row.photoUrl,
        severity: ai.severity, safetyRisk: ai.safetyRisk, nearSensitivePlace: ai.nearSchoolOrHospital, aiConfidence: ai.confidence, needsReview: ai.needsReview,
        priority: priority.score, priorityReason: priority.reasonText, routingSource: `import:${ai.routingSource}`,
        departmentId: ai.departmentId, categoryId: ai.categoryId, wardId: ward?.id, issueId: issue.id,
        createdAt: new Date(row.createdAt), slaHours: ai.slaHours, dueAt: computeDueAt(row.createdAt, ai.slaHours),
        status: 'NEEDS_REVIEW',
      } })
      await tx.statusHistory.create({ data: { complaintId: c.id, toStatus: 'NEEDS_REVIEW', note: `Imported for review. Source: ${input.sourceUrl}. Permission: ${input.permission}` } })
      imported++
    }
  }, { timeout: 120000 })
  console.log(`Imported ${imported} reviewed source records. Existing data was preserved. No status emails sent for historical import.`)
} catch (e) { console.error(e.name === 'ZodError' ? 'Invalid complaint export. Check the documented JSON fields.' : e.message); process.exitCode = 1 }
finally { await prisma.$disconnect() }
