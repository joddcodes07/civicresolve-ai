// F1 · Priority score (0–100) with human-readable reasons.
//   P = 10·severity + 20·safety + crowd + overdue + 15·reopened + 10·nearSchool
// Crowd points are capped at 10 on purpose (fairness: louder/richer areas should
// not drown out genuinely dangerous complaints).

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export function priorityBand(score) {
  if (score >= 70) return 'urgent'
  if (score >= 40) return 'high'
  if (score >= 20) return 'normal'
  return 'low'
}

export function getPriority({
  severity = 3,
  safetyRisk = false,
  reportCount = 1,
  hoursPassed = 0,
  slaHours = 72,
  reopened = false,
  nearSchoolOrHospital = false,
} = {}) {
  const reasons = []
  let score = 0

  const sev = clamp(Math.round(severity), 1, 5)
  score += sev * 10
  reasons.push({ label: `Severity ${sev}`, points: sev * 10 })

  if (safetyRisk) {
    score += 20
    reasons.push({ label: 'Safety risk', points: 20 })
  }

  let crowd = 2 * (reportCount - 1)
  if (crowd > 10) crowd = 10
  if (crowd > 0) {
    score += crowd
    reasons.push({ label: `${reportCount} citizens reported`, points: crowd })
  }

  const overdue = hoursPassed - slaHours
  if (overdue > 0) {
    let late = Math.floor(overdue / 12) * 5
    if (late > 20) late = 20
    score += late
    reasons.push({ label: `Overdue ${Math.round(overdue)}h`, points: late })
  }

  if (reopened) {
    score += 15
    reasons.push({ label: 'Reopened by citizen', points: 15 })
  }

  if (nearSchoolOrHospital) {
    score += 10
    reasons.push({ label: 'School/hospital within 200m', points: 10 })
  }

  const capped = Math.min(100, score)
  return {
    score: capped,
    capped: score > 100,
    band: priorityBand(capped),
    reasons,
    reasonText: reasons.map((r) => `${r.label} +${r.points}`).join(' · '),
  }
}
