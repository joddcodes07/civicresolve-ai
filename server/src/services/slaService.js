// F2 · SLA deadline + status colour, and F3 · escalation level.

export const HOUR_MS = 3600 * 1000

export function computeDueAt(createdAt, slaHours) {
  return new Date(new Date(createdAt).getTime() + slaHours * HOUR_MS)
}

export function hoursBetween(from, to = new Date()) {
  return (new Date(to).getTime() - new Date(from).getTime()) / HOUR_MS
}

/**
 * F2 — is the complaint late?
 *   used% = hoursPassed / slaHours * 100
 *   green < 50% · amber 50–100% · red > 100% (breached)
 */
export function getSlaStatus(createdAt, slaHours, now = new Date()) {
  const dueAt = computeDueAt(createdAt, slaHours)
  const hoursPassed = hoursBetween(createdAt, now)
  const usedPct = slaHours > 0 ? (hoursPassed / slaHours) * 100 : 0
  const hoursLeft = hoursBetween(now, dueAt)
  const breached = hoursPassed > slaHours

  let colour = 'green'
  if (breached) colour = 'red'
  else if (usedPct >= 50) colour = 'amber'

  return {
    dueAt,
    hoursPassed: Math.max(0, hoursPassed),
    hoursLeft,
    usedPct: Math.min(999, Math.max(0, usedPct)),
    colour,
    breached,
    label: breached
      ? `Breached ${Math.round(Math.abs(hoursLeft))}h`
      : `${Math.round(hoursLeft)}h left`,
  }
}

/**
 * F3 — escalation level from overdue hours.
 *   overdue ≤ 0 → 0 (officer) · 0–24h → 1 (dept head) · > 24h → 2 (commissioner)
 */
export function getEscalationLevel(hoursPassed, slaHours) {
  const overdue = hoursPassed - slaHours
  if (overdue <= 0) return 0
  if (overdue <= 24) return 1
  return 2
}

export const ESCALATION_LABELS = {
  0: 'With officer',
  1: 'Escalated · Dept head',
  2: 'Escalated · Commissioner',
}
