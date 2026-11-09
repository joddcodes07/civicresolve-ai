import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, KpiCard, Skeleton, EmptyState } from '../../components/ui/Primitives.jsx'
import { ComplaintRow } from '../../components/domain/ComplaintRow.jsx'

export default function AdminEscalations() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/admin/escalations')
  const escalations = data?.escalations || []
  const level1 = escalations.filter((e) => e.escalationLevel === 1)
  const level2 = escalations.filter((e) => e.escalationLevel === 2)

  return (
    <div>
      <SectionLabel index={3} right={<span className="label">{escalations.length} escalated</span>}>
        {t('admin.tab.escalations')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">
        Complaints that have crossed their deadline.
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
        Level 1 alerts the department head. Level 2 alerts the commissioner. The SLA watchdog re-checks
        every 15 minutes, so nothing stalls silently.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={t('admin.escalationsL1')} value={data?.level1 ?? '—'} tone="saffron" />
        <KpiCard label={t('admin.escalationsL2')} value={data?.level2 ?? '—'} tone="red" />
        <KpiCard label="Total escalated" value={escalations.length} tone="ink" />
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : escalations.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Nothing escalated" body="Every open complaint is within its deadline." />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[
            { label: t('admin.escalationsL2'), rows: level2, tone: 'red' },
            { label: t('admin.escalationsL1'), rows: level1, tone: 'saffron' },
          ].map(
            (group) =>
              group.rows.length > 0 && (
                <div key={group.label}>
                  <div className="hair-b mb-4 flex items-center justify-between pb-3">
                    <span className={`label ${group.tone === 'red' ? 'text-red' : 'text-saffron'}`}>{group.label}</span>
                    <span className="mono text-[12px] text-ink-faint">{group.rows.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-line">
                    <div className="divide-y divide-line">
                      {group.rows.map((c) => (
                        <ComplaintRow key={c.id} complaint={c} to={`/admin/c/${c.id}`} showReasons />
                      ))}
                    </div>
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  )
}
