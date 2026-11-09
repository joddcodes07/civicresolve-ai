import { TONE_DOT } from '../../lib/format.js'

/** Numbered editorial section header:  /01  LODGE  ———— */
export function SectionLabel({ index, children, right, className = '' }) {
  return (
    <div className={`hair-b mb-6 flex items-end justify-between gap-6 pb-3 ${className}`}>
      <div className="flex items-baseline gap-4">
        {index != null && <span className="label">/{String(index).padStart(2, '0')}</span>}
        <span className="label label-ink">{children}</span>
      </div>
      {right}
    </div>
  )
}

export function Hairline({ className = '' }) {
  return <div className={`h-px w-full bg-line ${className}`} />
}

export function KpiCard({ label, value, sub, tone = 'ink', delay = 0, suffix }) {
  return (
    <div className="card card-shadow flex flex-col justify-between p-5" style={{ '--d': `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone] || 'bg-ink-soft'}`} />
      </div>
      <div className="mt-6">
        <div className="mono tabular text-3xl font-medium tracking-tight">
          {value}
          {suffix ? <span className="ml-0.5 text-lg text-ink-faint">{suffix}</span> : null}
        </div>
        {sub && <div className="mt-1 text-[12.5px] leading-snug text-ink-soft">{sub}</div>}
      </div>
    </div>
  )
}

export function StatColumns({ items = [] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-card p-4">
          <div className="label">{item.label}</div>
          <div className="mono tabular mt-2 text-2xl">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, body, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="opacity-40">{icon}</div>}
      <div className="font-display text-lg">{title}</div>
      {body && <p className="max-w-sm text-[13px] leading-relaxed text-ink-soft">{body}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-lg ${className}`} />
}

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-current/25 border-t-current ${className}`}
      aria-label="Loading"
    />
  )
}

export function LoadingBlock({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
