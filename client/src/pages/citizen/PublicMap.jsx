import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton } from '../../components/ui/Primitives.jsx'
import { Pill, BandPill } from '../../components/ui/Pills.jsx'
import { Tabs } from '../../components/ui/Tabs.jsx'
import { IssueMap } from '../../components/domain/IssueMap.jsx'
import { BAND_HEX } from '../../lib/mapPins.js'
import { timeAgo } from '../../lib/format.js'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
]

export default function PublicMap() {
  const { t } = useI18n()
  const [filter, setFilter] = useState('all')
  const [heat, setHeat] = useState(false)
  const [params] = useSearchParams()
  const preview = params.get('demo') === '1'
  const liveOnly = params.get('demo') === '0'
  const demoMode = preview ? 'preview' : liveOnly ? '0' : 'mixed'
  const { data, loading, error, reload } = useFetch(`/api/issues/map?demo=${demoMode}`)

  const issues = data?.issues || []
  const filtered = useMemo(() => (filter === 'all' ? issues : issues.filter((i) => i.priorityBand === filter || (filter === 'normal' && i.priorityBand === 'low'))), [issues, filter])
  const demoCount = filtered.filter((issue) => issue.demo).length
  const liveCount = filtered.length - demoCount
  const top = useMemo(() => [...filtered].sort((a, b) =>
    Number(Boolean(a.demo)) - Number(Boolean(b.demo)) || b.reportCount - a.reportCount,
  ).slice(0, 12), [filtered])

  return (
    <div className="frame py-10">
      <SectionLabel index={7} right={data && !loading && !error && (
        <div className="flex flex-wrap gap-2">
          {!preview && <Pill tone="green">{liveCount} {t('map.liveIssues')}</Pill>}
          {data.demo && <Pill tone="blue">{demoCount} {t('map.demoIssues')}</Pill>}
        </div>
      )}>
        {t('map.title')}
      </SectionLabel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-xl font-display text-4xl tracking-tight">{t('map.sub')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={preview || liveOnly ? '/map' : '/map?demo=0'} preventScrollReset className="pill border border-line text-blue">
            {t(preview || liveOnly ? 'common.showMixed' : 'common.showLive')}
          </Link>
          <Tabs tabs={FILTERS} value={filter} onChange={setFilter} />
          <button
            aria-pressed={heat}
            onClick={() => setHeat((v) => !v)}
            className={`pill border ${heat ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft'}`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {data?.demo && !loading && <p className="mt-4 text-sm text-ink-soft">{t('map.demoMarkers')}</p>}
      {error && (
        <div role="status" className="card mt-6 flex flex-wrap items-center gap-3 p-4">
          <span>{t('map.unavailable')}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reload().catch(() => {})}>{t('map.retry')}</button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {loading ? <Skeleton className="h-[520px] w-full" /> : <IssueMap issues={filtered} height={520} heat={heat} />}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="label">{t('map.legend')}</span>
            {[
              ['urgent', t('map.priorityUrgent')],
              ['high', t('map.priorityHigh')],
              ['normal', t('map.priorityNormal')],
              ['low', t('map.priorityLow')],
              ['verified', t('map.resolved')],
            ].map(([band, label]) => (
              <span key={band} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAND_HEX[band] }} />
                <span className="label">{label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="card overflow-hidden">
            <div className="hair-b px-5 py-4">
              <span className="label label-ink">Most reported</span>
            </div>
            <div className="max-h-[460px] divide-y divide-line overflow-y-auto">
              {top.map((issue) => (
                <div key={issue.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono text-[11px] text-ink-faint">{issue.code}</span>
                    <span className="pill border-blue/25 bg-blue-soft text-blue">{issue.reportCount} reports</span>
                  </div>
                  <div className="mt-1.5 text-[13.5px] font-medium">{issue.category?.name}</div>
                  <div className="mt-1 text-[12px] text-ink-soft">
                    {issue.department?.name} · {issue.ward?.name}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <BandPill band={issue.priorityBand} score={issue.priority} />
                    <span className="label">{issue.demo ? t('common.demo') : timeAgo(issue.createdAt)}</span>
                  </div>
                </div>
              ))}
              {!loading && !error && top.length === 0 && <div className="p-5 text-[13px] text-ink-soft">No issues match this filter.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
