import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { Button } from '../../components/ui/Button.jsx'
import { SectionLabel, EmptyState, Skeleton } from '../../components/ui/Primitives.jsx'
import { ComplaintRow } from '../../components/domain/ComplaintRow.jsx'

export default function MyComplaints() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/complaints/mine')
  const complaints = data?.complaints || []

  return (
    <div className="frame py-10">
      <SectionLabel index={6} right={<Button to="/lodge" size="sm" variant="saffron">{t('nav.lodge')}</Button>}>
        {t('my.title')}
      </SectionLabel>
      <h1 className="max-w-2xl font-display text-4xl tracking-tight">{t('my.sub')}</h1>

      <div className="mt-10 overflow-hidden rounded-xl border border-line">
        {loading && (
          <div className="space-y-px bg-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && complaints.length === 0 && (
          <div className="bg-card p-4">
            <EmptyState
              title={t('my.empty')}
              body="Lodge your first complaint — it takes about a minute."
              action={<Button to="/lodge" variant="saffron" size="sm" className="mt-2">{t('nav.lodge')}</Button>}
            />
          </div>
        )}

        {!loading && complaints.length > 0 && (
          <div className="divide-y divide-line">
            {complaints.map((c) => (
              <ComplaintRow key={c.id} complaint={c} to={`/track/${c.code}`} showReasons />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
