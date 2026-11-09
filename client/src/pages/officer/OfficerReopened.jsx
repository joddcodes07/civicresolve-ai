import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, EmptyState, Skeleton } from '../../components/ui/Primitives.jsx'
import { ComplaintRow } from '../../components/domain/ComplaintRow.jsx'

export default function OfficerReopened() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/officer/reopened')
  const complaints = data?.complaints || []

  return (
    <div>
      <SectionLabel index={2} right={<span className="label">{complaints.length} reopened</span>}>
        {t('officer.reopened')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl leading-tight tracking-tight md:text-4xl">
        Complaints where the citizen said the fix was not real.
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
        These carry +15 priority and count against the department's verified resolution rate. Reopen the
        work — do not just close it again.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        {loading ? (
          <div className="space-y-px bg-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-card p-4">
            <EmptyState title="No reopened complaints" body="Every resolved complaint was accepted. Good work." />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {complaints.map((c) => (
              <ComplaintRow key={c.id} complaint={c} to={`/officer/c/${c.id}`} showReasons />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
