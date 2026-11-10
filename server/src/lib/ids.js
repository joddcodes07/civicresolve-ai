// Random identifiers avoid count-then-insert collisions across API workers.
import { randomBytes } from 'node:crypto'
export async function nextComplaintCode() {
  return `CR-${new Date().getFullYear()}-${randomBytes(8).toString('hex').toUpperCase()}`
}
export async function nextIssueCode() { return `ISS-${randomBytes(8).toString('hex').toUpperCase()}` }
export function slaDueDate(from, slaHours) { return new Date(new Date(from).getTime() + slaHours * 3600_000) }
