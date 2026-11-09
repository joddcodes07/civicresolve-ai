import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from 'recharts'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { KpiCard, SectionLabel, Skeleton, EmptyState } from '../../components/ui/Primitives.jsx'
import { Pill, BandPill, StatusPill, PriorityScore } from '../../components/ui/Pills.jsx'
import { TONE_DOT, timeAgo } from '../../lib/format.js'
import { IconAlert } from '../../components/ui/Icons.jsx'

const BAND_COLOR = { urgent: '#d93a3f', high: '#f28c28', normal: '#2f5bea', low: '#4b4c54' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card card-shadow px-3 py-2 text-[12px]">
      <div className="label mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-soft">{p.dataKey}</span>
          <span className="mono ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminOverview() {
  const { t } = useI18n()
  const { data: overview, loading } = useFetch('/api/admin/overview')
  const { data: deptData } = useFetch('/api/admin/departments')

  const kpis = overview?.kpis || {}
  const trend = (overview?.trend || []).map((row) => ({ ...row, label: row.week.slice(5) }))
  const categories = (overview?.categoryBreakdown || []).map((row) => ({
    ...row,
    short: row.name.length > 17 ? `${row.name.slice(0, 16)}…` : row.name,
  }))
  const departments = deptData?.departments || []

  return (
    <div>
      <SectionLabel index={1} right={<span className="label">Updated {overview?.lastUpdated ? timeAgo(overview.lastUpdated) : '—'}</span>}>
        {t('admin.title')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">{t('admin.sub')}</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label={t('admin.kpi.total')} value={kpis.total ?? '—'} tone="ink" />
        <KpiCard label={t('admin.kpi.open')} value={kpis.open ?? '—'} tone="blue" />
        <KpiCard label={t('admin.kpi.ontime')} value={kpis.onTimePct ?? '—'} suffix="%" tone="amber" />
        <KpiCard label={t('admin.kpi.vrr')} value={kpis.vrr ?? '—'} suffix="%" tone="green" />
        <KpiCard label={t('admin.kpi.accuracy')} value={kpis.aiAccuracy ?? '—'} suffix="%" tone="violet" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('admin.kpi.dupes')} value={kpis.duplicatesMerged ?? '—'} tone="teal" />
        <KpiCard label="Needs review" value={kpis.needsReview ?? '—'} tone="saffron" />
        <KpiCard label={t('admin.escalationsL1')} value={kpis.escalationsL1 ?? '—'} tone="saffron" />
        <KpiCard label={t('admin.escalationsL2')} value={kpis.escalationsL2 ?? '—'} tone="red" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-7">
          <SectionLabel>{t('admin.trend')}</SectionLabel>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="rgba(19,20,25,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="lodged" stroke="#2f5bea" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#0f9b64" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue" /><span className="label">lodged</span></span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green" /><span className="label">resolved</span></span>
          </div>
        </div>

        <div className="card p-6 lg:col-span-5">
          <SectionLabel>{t('admin.byCategory')}</SectionLabel>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 14, bottom: 0, left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="short" width={132} tick={{ fontSize: 10.5, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#2f5bea" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="card overflow-hidden lg:col-span-7">
          <div className="hair-b flex items-center justify-between px-6 py-4">
            <span className="label label-ink">{t('admin.dpi')}</span>
            <Link to="/admin/departments" className="label text-ink-soft hover:text-ink">{t('common.view')} →</Link>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="hair-b text-left">
                <th className="label px-6 py-3 font-normal">Department</th>
                <th className="label px-3 py-3 font-normal">On-time</th>
                <th className="label px-3 py-3 font-normal">VRR</th>
                <th className="label px-3 py-3 font-normal">Rating</th>
                <th className="label px-6 py-3 text-right font-normal">DPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {departments.slice(0, 8).map((d) => (
                <tr key={d.departmentId}>
                  <td className="px-6 py-3">{d.name}</td>
                  <td className="mono px-3 py-3 text-ink-soft">{d.onTimePct}%</td>
                  <td className="mono px-3 py-3 text-ink-soft">{d.vrr}%</td>
                  <td className="mono px-3 py-3 text-ink-soft">{d.avgRating || '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${TONE_DOT[d.band === 'good' ? 'green' : d.band === 'amber' ? 'amber' : 'red']}`} />
                      <span className="mono">{d.dpi}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-ink-soft">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card p-6 lg:col-span-5">
          <SectionLabel right={<Link to="/admin/escalations" className="label text-ink-soft hover:text-ink">{t('common.view')} →</Link>}>
            Escalations
          </SectionLabel>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-saffron/25 bg-saffron-soft px-4 py-3">
              <span className="label text-saffron">{t('admin.escalationsL1')}</span>
              <span className="mono text-xl">{kpis.escalationsL1 ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-red/25 bg-red-soft px-4 py-3">
              <span className="label text-red">{t('admin.escalationsL2')}</span>
              <span className="mono text-xl">{kpis.escalationsL2 ?? 0}</span>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-soft">
            <IconAlert size={15} className="mt-0.5 shrink-0" />
            Late complaints escalate automatically every 15 minutes — Level 1 to the department head, Level 2 to the commissioner.
          </p>
        </div>
      </div>
    </div>
  )
}
