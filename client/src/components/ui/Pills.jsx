import { TONE_CLASS, STATUS_STYLE, BAND_STYLE, TONE_DOT } from '../../lib/format.js'

export function Pill({ tone = 'ink', dot = false, className = '', children }) {
  return (
    <span className={`pill ${TONE_CLASS[tone] || TONE_CLASS.ink} ${className}`}>
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${TONE_DOT[tone] || 'bg-ink-soft'}`} />}
      {children}
    </span>
  )
}

export function StatusPill({ status, dot = true }) {
  const s = STATUS_STYLE[status] || { tone: 'ink', label: status }
  return (
    <Pill tone={s.tone} dot={dot}>
      {s.label}
    </Pill>
  )
}

export function BandPill({ band, score }) {
  const s = BAND_STYLE[band] || BAND_STYLE.normal
  return (
    <Pill tone={s.tone} dot>
      {s.label}
      {score != null ? ` · ${score}` : ''}
    </Pill>
  )
}

export function SlaTag({ sla }) {
  if (!sla) return null
  const tone = sla.colour === 'red' ? 'red' : sla.colour === 'amber' ? 'amber' : 'green'
  return (
    <Pill tone={tone}>
      {sla.breached ? `Breached ${Math.abs(sla.hoursLeft)}h` : `${Math.max(0, sla.hoursLeft)}h left`}
    </Pill>
  )
}

export function EscalationPill({ level, label }) {
  if (!level) return null
  return <Pill tone={level >= 2 ? 'red' : 'saffron'}>{label || `L${level}`}</Pill>
}

/** Bold priority score block used in the officer queue and complaint headers. */
export function PriorityScore({ score, band, size = 'md' }) {
  const s = BAND_STYLE[band] || BAND_STYLE.normal
  const dimensions = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-[15px]'
  return (
    <div className={`grid ${dimensions} shrink-0 place-items-center rounded-xl border ${TONE_CLASS[s.tone]}`} title={`Priority ${score} · ${s.label}`}>
      <span className="mono tabular font-medium leading-none">{score}</span>
    </div>
  )
}

export default Pill
