import { useState } from 'react'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton, EmptyState } from '../../components/ui/Primitives.jsx'
import { Tabs } from '../../components/ui/Tabs.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ComplaintRow } from '../../components/domain/ComplaintRow.jsx'

const STATUS_TABS = [
  { value: 'open', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CONFIRMED', label: 'Verified' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'all', label: 'All' },
]

export default function AdminComplaints() {
  const { t } = useI18n()
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const { data, loading } = useFetch(`/api/admin/complaints?status=${status}&page=${page}`)

  const complaints = data?.complaints || []

  return (
    <div>
      <SectionLabel index={2} right={<span className="label">{data?.total ?? 0} total</span>}>
        {t('admin.tab.complaints')}
      </SectionLabel>
      <h1 className="font-display text-3xl tracking-tight md:text-4xl">Every complaint across the city.</h1>

      <div className="mt-8">
        <Tabs tabs={STATUS_TABS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        {loading ? (
          <div className="space-y-px bg-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-card p-4"><Skeleton className="h-4 w-2/3" /></div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-card p-4"><EmptyState title="No complaints in this view" /></div>
        ) : (
          <div className="divide-y divide-line">
            {complaints.map((c) => (
              <ComplaintRow key={c.id} complaint={c} to={`/admin/c/${c.id}`} showReasons />
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.back')}</Button>
          <span className="label">Page {page} / {data.totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</Button>
        </div>
      )}
    </div>
  )
}
