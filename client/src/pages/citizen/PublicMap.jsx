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
  const demoMode = preview ? 'preview' : '1'
  const { data, loading, error, reload } = useFetch(`/api/issues/map?demo=${demoMode}`)

  const issues = data?.issues || []
  const filtered = useMemo(() => (filter === 'all' ? issues : issues.filter((i) => i.priorityBand === filter || (filter === 'normal' && i.priorityBand === 'low'))), [issues, filter])
  const top = useMemo(() => [...filtered].sort((a, b) => b.reportCount - a.reportCount).slice(0, 12), [filtered])

  return (
    <div className="frame py-10">
      <SectionLabel index={7} right={data && !error && <Pill tone="blue">{filtered.length} {t(data.demo ? 'map.demoIssues' : 'map.issues')}</Pill>}>
        {t('map.title')}
      </SectionLabel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-xl font-display text-4xl tracking-tight">{t('map.sub')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {(preview || (data && !data.demo)) && (
            <Link to={preview ? '/map' : '/map?demo=1'} preventScrollReset className="pill border border-line text-blue">
              {t(preview ? 'common.showLive' : 'common.showDemo')}
            </Link>
          )}
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

      {data?.demo && <p className="mt-4 text-sm text-ink-soft">{t('map.demoNote')}</p>}
      {error && (
        <div role="status" className="card mt-6 flex flex-wrap items-center gap-3 p-4">
          <span>{t('map.unavailable')}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reload().catch(() => {})}>{t('map.retry')}</button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {loading ? <Skeleton className="h-[520px] w-full" /> : <IssueMap issues={filtered} height={520} heat={heat} demo={data?.demo} />}
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
                    <span className="label">{data?.demo ? t('common.demo') : timeAgo(issue.createdAt)}</span>
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
