import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton, KpiCard } from '../../components/ui/Primitives.jsx'
import { TONE_DOT } from '../../lib/format.js'

const BAND_LABEL = { good: 'Performing', amber: 'Watch', poor: 'Needs attention' }

export default function AdminDepartments() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/admin/departments')
  const departments = data?.departments || []

  const best = departments[0]
  const worst = departments[departments.length - 1]
  const avg = departments.length ? Math.round((departments.reduce((s, d) => s + d.dpi, 0) / departments.length) * 10) / 10 : 0

  return (
    <div>
      <SectionLabel index={5} right={<span className="label">{departments.length} departments</span>}>
        {t('admin.tab.departments')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">{t('admin.dpi')}</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">{t('admin.dpiSub')}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="City average DPI" value={avg} tone="blue" />
        <KpiCard label="Best performer" value={best?.dpi ?? '—'} sub={best?.name} tone="green" />
        <KpiCard label="Needs attention" value={worst?.dpi ?? '—'} sub={worst?.name} tone="red" />
        <KpiCard label="Total fixed" value={departments.reduce((s, d) => s + d.fixed, 0)} tone="ink" />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="hair-b text-left">
              <th className="label px-6 py-3 font-normal">Department</th>
              <th className="label px-3 py-3 font-normal">Open</th>
              <th className="label px-3 py-3 font-normal">Fixed</th>
              <th className="label px-3 py-3 font-normal">On-time</th>
              <th className="label px-3 py-3 font-normal">VRR</th>
              <th className="label px-3 py-3 font-normal">Rating</th>
              <th className="label px-3 py-3 font-normal">DPI</th>
              <th className="label px-6 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-6 py-3"><Skeleton className="h-4 w-2/3" /></td>
                </tr>
              ))}
            {departments.map((d) => (
              <tr key={d.departmentId} className="hover:bg-paper-2">
                <td className="px-6 py-3">
                  <div className="font-medium">{d.name}</div>
                  <div className="mono mt-0.5 text-[10.5px] text-ink-faint">{d.code} · {d.slaHours}h SLA</div>
                </td>
                <td className="mono px-3 py-3 text-ink-soft">{d.open}</td>
                <td className="mono px-3 py-3 text-ink-soft">{d.fixed}</td>
                <td className="mono px-3 py-3 text-ink-soft">{d.onTimePct}%</td>
                <td className="mono px-3 py-3 text-ink-soft">{d.vrr}%</td>
                <td className="mono px-3 py-3 text-ink-soft">{d.avgRating || '—'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                      <div
                        className={`h-full rounded-full ${d.band === 'good' ? 'bg-green' : d.band === 'amber' ? 'bg-amber' : 'bg-red'}`}
                        style={{ width: `${d.dpi}%` }}
                      />
                    </div>
                    <span className="mono">{d.dpi}</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${TONE_DOT[d.band === 'good' ? 'green' : d.band === 'amber' ? 'amber' : 'red']}`} />
                    <span className="label">{BAND_LABEL[d.band]}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
