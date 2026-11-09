// Formatting helpers shared across screens.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  const h = d.getHours() % 12 || 12
  const ampm = d.getHours() >= 12 ? 'pm' : 'am'
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} · ${h}:${String(d.getMinutes()).padStart(2, '0')}${ampm}`
}

export function timeAgo(value) {
  if (!value) return '—'
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function formatHours(hours) {
  const h = Math.abs(Math.round(hours || 0))
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  const rem = h % 24
  return rem ? `${d}d ${rem}h` : `${d}d`
}

export function pct(n) {
  return `${Math.round(n || 0)}%`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// Semantic colour tokens for status / band keys.
export const STATUS_STYLE = {
  SUBMITTED: { tone: 'blue', label: 'Submitted' },
  ASSIGNED: { tone: 'blue', label: 'Assigned' },
  IN_PROGRESS: { tone: 'amber', label: 'In progress' },
  RESOLVED: { tone: 'violet', label: 'Resolved' },
  CONFIRMED: { tone: 'green', label: 'Verified fixed' },
  REOPENED: { tone: 'red', label: 'Reopened' },
  NEEDS_REVIEW: { tone: 'saffron', label: 'Needs review' },
}

export const BAND_STYLE = {
  urgent: { tone: 'red', label: 'Urgent' },
  high: { tone: 'saffron', label: 'High' },
  normal: { tone: 'blue', label: 'Normal' },
  low: { tone: 'ink', label: 'Low' },
}

export const TONE_CLASS = {
  blue: 'text-blue border-blue/25 bg-blue-soft',
  teal: 'text-teal border-teal/25 bg-teal/10',
  saffron: 'text-saffron border-saffron/30 bg-saffron-soft',
  amber: 'text-amber border-amber/30 bg-amber-soft',
  red: 'text-red border-red/25 bg-red-soft',
  green: 'text-green border-green/25 bg-green-soft',
  violet: 'text-violet border-violet/25 bg-violet/10',
  ink: 'text-ink-soft border-line bg-paper-2',
}

export const TONE_DOT = {
  blue: 'bg-blue',
  teal: 'bg-teal',
  saffron: 'bg-saffron',
  amber: 'bg-amber',
  red: 'bg-red',
  green: 'bg-green',
  violet: 'bg-violet',
  ink: 'bg-ink-soft',
}
