import { useState } from 'react'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton } from '../../components/ui/Primitives.jsx'
import { BandPill, PriorityScore, StatusPill } from '../../components/ui/Pills.jsx'
import { IssueMap } from '../../components/domain/IssueMap.jsx'
import { Link } from 'react-router-dom'

export default function OfficerMap() {
  const { t } = useI18n()
  const [selected, setSelected] = useState(null)
  const { data, loading } = useFetch('/api/officer/map')

  const complaints = data?.complaints || []
  const markers = complaints.map((c) => ({
    id: c.id,
    code: c.code,
    lat: c.lat,
    lng: c.lng,
    reportCount: c.reportCount || 1,
    priority: c.priority,
    priorityBand: c.priorityBand,
    status: c.status,
    category: c.category,
    department: c.department,
    ward: c.ward,
    createdAt: c.createdAt,
  }))

  return (
    <div>
      <SectionLabel index={3} right={<span className="label">{markers.length} open</span>}>
        Department map
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">
        Where your open complaints are.
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {loading ? <Skeleton className="h-[520px] w-full" /> : <IssueMap issues={markers} height={520} onSelect={(issue) => console.log(issue)} />}
        </div>
        <div className="lg:col-span-4">
          <div className="card overflow-hidden">
            <div className="hair-b px-5 py-4">
              <span className="label label-ink">Highest priority first</span>
            </div>
            <div className="max-h-[460px] divide-y divide-line overflow-y-auto">
              {[...complaints]
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 14)
                .map((c) => (
                  <Link key={c.id} to={`/officer/c/${c.id}`} className="flex items-start gap-3 p-4 hover:bg-paper-2">
                    <PriorityScore score={c.priority} band={c.priorityBand} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{c.summary}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-soft">
                        <span className="mono">{c.code}</span>
                        <StatusPill status={c.status} dot={false} />
                      </div>
                    </div>
                  </Link>
                ))}
              {complaints.length === 0 && !loading && <div className="p-5 text-[13px] text-ink-soft">No open complaints.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
