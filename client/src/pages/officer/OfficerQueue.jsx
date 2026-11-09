import { useMemo, useState } from 'react'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { Button } from '../../components/ui/Button.jsx'
import { KpiCard, EmptyState, Skeleton, SectionLabel } from '../../components/ui/Primitives.jsx'
import { Tabs } from '../../components/ui/Tabs.jsx'
import { ComplaintRow } from '../../components/domain/ComplaintRow.jsx'
import { IconDownload, IconTrack } from '../../components/ui/Icons.jsx'

const FILTERS = [
  { value: 'open', key: 'officer.open' },
  { value: 'urgent', key: 'officer.urgent' },
  { value: 'breached', key: 'officer.breached' },
  { value: 'safety', key: 'officer.safety' },
  { value: 'in_progress', key: 'officer.inProgress' },
  { value: 'needs_review', key: 'officer.needsReview' },
  { value: 'reopened', key: 'officer.reopened' },
]

function toCsv(rows) {
  const header = ['code', 'status', 'priority', 'category', 'department', 'ward', 'sla', 'summary']
  const lines = rows.map((c) =>
    [c.code, c.status, c.priority, c.category?.name, c.department?.name, c.ward?.name, c.sla?.label, (c.summary || '').replace(/"/g, "'")]
      .map((v) => `"${v ?? ''}"`)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export default function OfficerQueue() {
  const { t } = useI18n()
  const [filter, setFilter] = useState('open')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const query = `/api/officer/queue?filter=${filter}&page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const { data, loading, reload } = useFetch(query)
  const { data: statsData } = useFetch('/api/officer/stats')

  const complaints = data?.complaints || []
  const stats = statsData?.stats || {}

  const tabs = useMemo(() => FILTERS.map((f) => ({ value: f.value, label: t(f.key) })), [t])

  function exportCsv() {
    const blob = new Blob([toCsv(complaints)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `civicresolve-queue-${filter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <SectionLabel index={1} right={<span className="label">{data?.total ?? 0} in view</span>}>
        {t('officer.title')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl leading-tight tracking-tight md:text-4xl">{t('officer.sub')}</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('officer.kpi.open')} value={stats.open ?? '—'} tone="blue" />
        <KpiCard label={t('officer.kpi.breached')} value={stats.breached ?? '—'} tone="red" />
        <KpiCard label={t('officer.kpi.avg')} value={stats.avgResolutionHours ?? '—'} suffix="h" tone="amber" />
        <KpiCard label={t('officer.kpi.vrr')} value={stats.verifiedResolutionRate ?? '—'} suffix="%" tone="green" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Tabs tabs={tabs} value={filter} onChange={(v) => { setFilter(v); setPage(1) }} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2">
            <IconTrack size={15} className="text-ink-faint" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder={t('officer.search')}
              className="w-40 bg-transparent text-[13px] outline-none placeholder:text-ink-ghost md:w-56"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={exportCsv} icon={<IconDownload size={15} />}>
            {t('officer.export')}
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        {loading ? (
          <div className="space-y-px bg-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-card p-4">
            <EmptyState title={t('officer.empty')} body="Nothing matches this filter right now." />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {complaints.map((c) => (
              <ComplaintRow key={c.id} complaint={c} to={`/officer/c/${c.id}`} showReasons />
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.back')}
          </Button>
          <span className="label">
            Page {page} / {data.totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
