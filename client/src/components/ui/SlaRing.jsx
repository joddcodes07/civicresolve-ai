import { formatHours } from '../../lib/format.js'

const COLOUR = { green: 'var(--color-green)', amber: 'var(--color-amber)', red: 'var(--color-red)' }

/** SVG ring showing hours used against the SLA deadline (F2). */
export function SlaRing({ usedPct = 0, colour = 'green', hoursLeft = 0, breached = false, size = 148, label }) {
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, usedPct))
  const dashoffset = circumference * (1 - clamped / 100)
  const color = COLOUR[colour] || COLOUR.green
  const remaining = Math.max(0, Math.round(hoursLeft))

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="mono tabular text-2xl font-medium leading-none" style={{ color }}>
          {breached ? `+${formatHours(Math.abs(hoursLeft))}` : formatHours(remaining)}
        </div>
        <div className="label mt-1.5">{label || (breached ? 'overdue' : 'remaining')}</div>
        <div className="mono mt-1 text-[10px] text-ink-ghost">{Math.round(clamped)}% used</div>
      </div>
    </div>
  )
}

export default SlaRing
