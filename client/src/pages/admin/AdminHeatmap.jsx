import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton } from '../../components/ui/Primitives.jsx'
import { BandPill } from '../../components/ui/Pills.jsx'
import { IssueMap } from '../../components/domain/IssueMap.jsx'
import { TONE_DOT } from '../../lib/format.js'

export default function AdminHeatmap() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/admin/heatmap')
  const wards = data?.wards || []

  const maxOpen = Math.max(1, ...wards.map((w) => w.open))
  const sorted = [...wards].sort((a, b) => b.open - a.open)

  const markers = wards
    .filter((w) => w.open > 0)
    .map((w) => ({
      id: w.wardId,
      code: w.name.split(' · ')[1] || w.name,
      lat: w.lat,
      lng: w.lng,
      reportCount: w.open,
      priority: Math.round(w.avgPriority),
      priorityBand: w.band,
      category: { name: `${w.open} open complaints` },
      department: { name: `Avg priority ${w.avgPriority}` },
      ward: { name: w.name },
      createdAt: new Date().toISOString(),
    }))

  return (
    <div>
      <SectionLabel index={7} right={<span className="label">{wards.length} wards</span>}>
        {t('admin.tab.heatmap')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">{t('admin.heatmapTitle')}</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">{t('admin.heatmapSub')}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {loading ? <Skeleton className="h-[520px] w-full" /> : <IssueMap issues={markers} height={520} heat />}
        </div>

        <div className="lg:col-span-5">
          <div className="card p-6">
            <SectionLabel>Open complaints by ward</SectionLabel>
            <div className="space-y-4">
              {sorted.map((w) => (
                <div key={w.wardId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px]">{w.name}</span>
                    <span className="mono text-[12px] text-ink-soft">{w.open}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className={`h-full rounded-full ${TONE_DOT[w.band] || 'bg-ink-soft'}`}
                        style={{ width: `${(w.open / maxOpen) * 100}%` }}
                      />
                    </div>
                    <BandPill band={w.band} score={w.avgPriority} />
                  </div>
                </div>
              ))}
              {!loading && sorted.length === 0 && <p className="text-[13px] text-ink-soft">No open complaints.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
