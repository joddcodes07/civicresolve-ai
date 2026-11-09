import { StatusPill } from '../ui/Pills.jsx'
import { formatDateTime } from '../../lib/format.js'

const DOT_TONE = {
  SUBMITTED: 'bg-blue',
  ASSIGNED: 'bg-blue',
  IN_PROGRESS: 'bg-amber',
  RESOLVED: 'bg-violet',
  CONFIRMED: 'bg-green',
  REOPENED: 'bg-red',
  NEEDS_REVIEW: 'bg-saffron',
}

/** Vertical timeline of every status change, with who and when. */
export function Timeline({ history = [] }) {
  if (!history.length) {
    return <p className="text-[13px] text-ink-soft">No timeline entries yet.</p>
  }
  return (
    <ol className="relative">
      {history.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < history.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-line" aria-hidden="true" />}
          <span className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-card ${DOT_TONE[entry.toStatus] || 'bg-ink-soft'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={entry.toStatus} dot={false} />
              <span className="mono text-[11px] text-ink-faint">{formatDateTime(entry.createdAt)}</span>
            </div>
            {entry.note && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{entry.note}</p>}
            {entry.changedBy && <p className="label mt-1">by {entry.changedBy}</p>}
            {entry.photoUrl && (
              <img src={entry.photoUrl} alt="Proof" className="mt-2 h-24 w-32 rounded-lg border border-line object-cover" />
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default Timeline
