import { Link } from 'react-router-dom'
import { StatusPill, BandPill, PriorityScore, SlaTag, EscalationPill } from '../ui/Pills.jsx'
import { timeAgo } from '../../lib/format.js'

/** One complaint as a row. Used by citizen lists, the officer queue and admin tables. */
export function ComplaintRow({ complaint, to, showScore = true, showReasons = false, right }) {
  const inner = (
    <>
      {showScore && <PriorityScore score={complaint.priority} band={complaint.priorityBand} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono text-[11px] tracking-wider text-ink-faint">{complaint.code}</span>
          <StatusPill status={complaint.status} />
          {complaint.escalationLevel > 0 && <EscalationPill level={complaint.escalationLevel} label={complaint.escalationLabel} />}
          {complaint.safetyRisk && <BandPill band="urgent" />}
        </div>
        <div className="mt-2 truncate text-[14px] font-medium">{complaint.summary || complaint.originalText}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
          <span>{complaint.category?.name}</span>
          <span className="text-ink-ghost">·</span>
          <span>{complaint.department?.name}</span>
          {complaint.ward && (
            <>
              <span className="text-ink-ghost">·</span>
              <span>{complaint.ward.name}</span>
            </>
          )}
          {complaint.reportCount > 1 && (
            <>
              <span className="text-ink-ghost">·</span>
              <span className="text-blue">{complaint.reportCount} reports</span>
            </>
          )}
          <span className="text-ink-ghost">·</span>
          <span>{timeAgo(complaint.createdAt)}</span>
        </div>
        {showReasons && complaint.priorityReason && (
          <div className="mt-2 truncate text-[11.5px] text-ink-faint">{complaint.priorityReason}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <SlaTag sla={complaint.sla} />
        {right}
      </div>
    </>
  )

  const className = 'flex items-start gap-4 bg-card p-4 transition-colors hover:bg-paper-2'
  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}

export default ComplaintRow
