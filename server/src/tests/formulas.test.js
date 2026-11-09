// Unit tests for the seven formulas and the local classifier.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { getPriority, priorityBand } from '../services/priorityService.js'
import { getEscalationLevel, getSlaStatus, computeDueAt } from '../services/slaService.js'
import { computeVrr, computeDpiPct, computeAccuracy, dpiBand, summariseDepartment } from '../services/metricsService.js'
import { assessResolutionNote, checkProofOfFix } from '../services/proofService.js'
import { classifyWithRules } from '../services/classifier/rules.js'
import { haversineMetres, pointInPolygon, resolveWard } from '../lib/geo.js'
import { cosineSimilarity, jaccard, maskPII } from '../lib/text.js'

// ---- F1 priority ----------------------------------------------------------

test('F1 · the atlas worked example (Lane-4 open manhole) scores 84', () => {
  // S=5 →50, safety +20, 3 reports → crowd +4, school nearby +10 = 84
  const p = getPriority({
    severity: 5,
    safetyRisk: true,
    reportCount: 3,
    hoursPassed: 0,
    slaHours: 72,
    reopened: false,
    nearSchoolOrHospital: true,
  })
  assert.equal(p.score, 84)
  assert.equal(p.band, 'urgent')
  assert.equal(p.reasons.length, 4)
})

test('F1 · crowd points are capped at 10 for fairness', () => {
  const p = getPriority({ severity: 1, reportCount: 50, hoursPassed: 0, slaHours: 72 })
  // 10 severity + 10 (capped crowd, not 98) = 20
  assert.equal(p.score, 20)
})

test('F1 · overdue points are capped at 20 and the total at 100', () => {
  const p = getPriority({ severity: 5, safetyRisk: true, reportCount: 1, hoursPassed: 500, slaHours: 24, reopened: true, nearSchoolOrHospital: true })
  assert.equal(p.score, 100)
  assert.equal(p.capped, true)
})

test('F1 · bands follow the documented thresholds', () => {
  assert.equal(priorityBand(70), 'urgent')
  assert.equal(priorityBand(40), 'high')
  assert.equal(priorityBand(20), 'normal')
  assert.equal(priorityBand(19), 'low')
})

// ---- F2 SLA ---------------------------------------------------------------

test('F2 · due time = filed + SLA hours', () => {
  const filed = new Date('2026-10-24T09:12:00Z')
  const due = computeDueAt(filed, 72)
  assert.equal(due.toISOString(), '2026-10-27T09:12:00.000Z')
})

test('F2 · colours: green <50%, amber 50–100%, red when breached', () => {
  const filed = new Date(Date.now() - 30 * 3600 * 1000) // 30h of a 72h SLA = 42%
  assert.equal(getSlaStatus(filed, 72).colour, 'green')
  const mid = new Date(Date.now() - 50 * 3600 * 1000) // ~69%
  assert.equal(getSlaStatus(mid, 72).colour, 'amber')
  const late = new Date(Date.now() - 100 * 3600 * 1000) // >100%
  const red = getSlaStatus(late, 72)
  assert.equal(red.colour, 'red')
  assert.equal(red.breached, true)
})

// ---- F3 escalation --------------------------------------------------------

test('F3 · escalation levels from overdue hours', () => {
  assert.equal(getEscalationLevel(70, 72), 0) // not overdue
  assert.equal(getEscalationLevel(80, 72), 1) // 8h overdue
  assert.equal(getEscalationLevel(96, 72), 1) // exactly 24h overdue
  assert.equal(getEscalationLevel(110, 72), 2) // 38h overdue
})

// ---- F5 / F6 / F7 ---------------------------------------------------------

test('F5 · Verified Resolution Rate', () => {
  assert.equal(computeVrr(1620, 380), 81)
  assert.equal(computeVrr(0, 0), 0)
})

test('F6 · Department Performance Index example = 82.0', () => {
  const dpi = computeDpiPct({ onTimePct: 78, vrrPct: 86, avgRating: 4.1 })
  assert.equal(Math.round(dpi * 10) / 10, 82)
  assert.equal(dpiBand(82), 'good')
  assert.equal(dpiBand(66), 'amber')
  assert.equal(dpiBand(40), 'poor')
})

test('F7 · routing accuracy', () => {
  assert.equal(Math.round(computeAccuracy(11920, 1430) * 10) / 10, 88)
  assert.equal(computeAccuracy(0, 0), 100)
})

test('summariseDepartment rolls complaints into a scorecard', () => {
  const now = Date.now()
  const rows = [
    { status: 'CONFIRMED', dueAt: new Date(now + 3600000), resolvedAt: new Date(now), reopened: false, feedback: { confirmed: true, rating: 5 } },
    { status: 'CONFIRMED', dueAt: new Date(now - 3600000), resolvedAt: new Date(now), reopened: false, feedback: { confirmed: true, rating: 4 } }, // late
    { status: 'REOPENED', dueAt: new Date(now + 3600000), resolvedAt: new Date(now), reopened: true, feedback: { confirmed: false, rating: 2 } },
    { status: 'ASSIGNED', dueAt: new Date(now - 7200000), resolvedAt: null, reopened: false, feedback: null }, // open + breached
  ]
  const s = summariseDepartment('Roads', rows)
  assert.equal(s.total, 4)
  assert.equal(s.open, 2) // REOPENED + ASSIGNED
  assert.equal(s.breached, 1)
  assert.equal(s.onTimePct, 50) // 1 of 2 fixed on time
  assert.equal(s.vrr, 66.7) // 2 confirmed vs 1 reopened
})

// ---- Proof of fix ---------------------------------------------------------

test('proof · rejects vague notes like "Forwarded to concerned department"', () => {
  const r = assessResolutionNote('Forwarded to concerned department.')
  assert.equal(r.ok, false)
  assert.ok(r.reasons.length >= 1)
})

test('proof · accepts a specific note with an after-photo', () => {
  const check = checkProofOfFix({ note: 'Garbage lifted by truck, area swept and sanitised.', afterPhotoUrl: '/uploads/x.jpg' })
  assert.equal(check.ok, true)
})

test('proof · requires an after-photo', () => {
  const check = checkProofOfFix({ note: 'Pothole filled with asphalt and compacted properly.', afterPhotoUrl: null })
  assert.equal(check.ok, false)
  assert.ok(check.reasons.some((r) => r.toLowerCase().includes('photo')))
})

test('proof · warns when the after-photo is far from the complaint', () => {
  const check = checkProofOfFix({
    note: 'Drain desilted and cover replaced on the spot.',
    afterPhotoUrl: '/uploads/y.jpg',
    afterLat: 18.60, afterLng: 73.90, complaintLat: 18.52, complaintLng: 73.85,
  })
  assert.equal(check.ok, false)
  assert.ok(check.reasons.some((r) => r.toLowerCase().includes('far') || r.includes('m from')))
})

// ---- Duplicate text similarity (F4 signal) --------------------------------

test('F4 · near-identical complaints score high, unrelated ones low', () => {
  const a = 'Manhole cover is missing near lane 4'
  const b = 'The manhole cover missing near lane four'
  const c = 'Streetlight is not working at the corner'
  assert.ok(cosineSimilarity(a, b) > 0.5)
  assert.ok(cosineSimilarity(a, c) < 0.2)
  assert.ok(jaccard(a, b) > jaccard(a, c))
})

// ---- Classifier -----------------------------------------------------------

test('classifier · English manhole complaint routes to Roads', () => {
  const r = classifyWithRules('An open manhole without a cover near the school gate is very dangerous')
  assert.equal(r.departmentCode, 'ROADS')
  assert.equal(r.safetyRisk, true)
  assert.ok(r.severity >= 4)
})

test('classifier · Hindi drain complaint routes to Drainage', () => {
  const r = classifyWithRules('नाला ब्लॉक है और गंदा पानी सड़क पर भर गया है')
  assert.equal(r.departmentCode, 'DRAINAGE')
  assert.equal(r.language, 'hi')
})

test('classifier · Hinglish garbage complaint routes to Waste', () => {
  const r = classifyWithRules('hamari gali me kachra nahi utha raha ek hafte se')
  assert.equal(r.departmentCode, 'WASTE')
  assert.equal(r.language, 'hinglish')
})

test('classifier · Marathi water complaint routes to Water Supply', () => {
  const r = classifyWithRules('आमच्या भागात पाणी येत नाही आणि त्रास होत आहे')
  assert.equal(r.departmentCode, 'WATER')
})

test('classifier · gibberish falls back to Others with low confidence', () => {
  const r = classifyWithRules('qwerty zxcvb plmokn')
  assert.equal(r.categoryName, 'Other / General')
  assert.equal(r.needsReview, true)
})

// ---- Geo + masking --------------------------------------------------------

test('geo · haversine distance is sane', () => {
  const d = haversineMetres(18.5204, 73.8567, 18.5304, 73.8567)
  assert.ok(d > 1000 && d < 1200, `expected ~1112m, got ${Math.round(d)}`)
})

test('geo · point in polygon + ward resolution', () => {
  const square = { type: 'Polygon', coordinates: [[[73.85, 18.51], [73.87, 18.51], [73.87, 18.53], [73.85, 18.53], [73.85, 18.51]]] }
  assert.equal(pointInPolygon(18.52, 73.86, square), true)
  assert.equal(pointInPolygon(19.0, 74.0, square), false)
  const wards = [{ id: 'w1', name: 'W1', lat: 18.52, lng: 73.86, boundary: square }]
  assert.equal(resolveWard(18.52, 73.86, wards).id, 'w1')
})

test('privacy · PII is masked before any external call', () => {
  const masked = maskPII('Call me on 9820012345 or mail ramesh@example.com, aadhaar 1234 5678 9012')
  assert.ok(!masked.includes('9820012345'))
  assert.ok(!masked.includes('ramesh@example.com'))
  assert.ok(masked.includes('[PHONE]'))
})
