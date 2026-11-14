import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'
import { Marquee } from '../../components/ui/Marquee.jsx'

export default function Departments() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/meta/departments')
  const { data: catData } = useFetch('/api/meta/categories')
  const departments = data?.departments || []
  const categories = catData?.categories || []

  return (
    <div className="frame py-10">
      <SectionLabel index={8} right={<Pill tone="ink">{departments.length} departments</Pill>}>
        {t('departments.title')}
      </SectionLabel>
      <h1 className="max-w-2xl font-display text-4xl tracking-tight">{t('departments.sub')}</h1>

      <div className="mt-8">
        <Marquee items={categories.map((c) => c.name)} />
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card p-6">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-4 w-3/4" />
            </div>
          ))}

        {departments.map((dept) => {
          const cats = categories.filter((c) => c.department?.id === dept.id)
          return (
            <div key={dept.id} className="bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-display text-xl tracking-tight">{dept.name}</div>
                  <div className="mono mt-1 text-[11px] text-ink-faint">{dept.code}</div>
                </div>
                <Pill tone={dept.slaHours <= 24 ? 'red' : dept.slaHours <= 72 ? 'amber' : 'green'}>
                  {t('departments.sla', { hours: dept.slaHours })}
                </Pill>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {cats.length > 0 ? (
                  cats.map((c) => (
                    <span key={c.id} className="pill border-line bg-paper-2 text-ink-soft">
                      {c.name}
                    </span>
                  ))
                ) : (
                  <span className="label">General complaints</span>
                )}
              </div>
              <div className="hair-t mt-4 pt-4">
                <span className="label">{dept.complaintCount} {t('home.demoComplaints')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
