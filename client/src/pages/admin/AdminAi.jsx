import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { SectionLabel, Skeleton, KpiCard } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'

function TooltipBox({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="card card-shadow px-3 py-2 text-[12px]">
      <div className="label mb-1">{row.name}</div>
      <div className="text-ink-soft">
        {row.total} complaints · {row.transferred} transferred
      </div>
      <div className="mono mt-1">{row.accuracy}% accurate</div>
    </div>
  )
}

export default function AdminAi() {
  const { t } = useI18n()
  const { data, loading } = useFetch('/api/admin/ai-accuracy')

  const perCategory = data?.perCategory || []

  return (
    <div>
      <SectionLabel index={6} right={<Pill tone="violet">{data?.engine || 'rules'}</Pill>}>
        {t('admin.tab.ai')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">
        Is the routing engine actually right?
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
        Accuracy is measured honestly: a complaint counts against the AI only when an officer had to
        transfer it because the AI sent it to the wrong department.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('admin.accuracy')} value={data?.accuracy ?? '—'} suffix="%" tone="green" />
        <KpiCard label="Transferred by officers" value={data?.transferredToAnotherDept ?? '—'} tone="saffron" />
        <KpiCard label="Needs-review rate" value={data?.needsReviewRate ?? '—'} suffix="%" tone="amber" />
        <KpiCard label="Avg. confidence" value={data ? Math.round(data.avgConfidence * 100) : '—'} suffix="%" tone="blue" />
      </div>

      <div className="mt-8 card p-6">
        <SectionLabel>{t('admin.confusion')}</SectionLabel>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perCategory} margin={{ top: 8, right: 12, bottom: 40, left: -18 }}>
                <CartesianGrid stroke="rgba(19,20,25,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fontSize: 9.5, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} barSize={22}>
                  {perCategory.map((row) => (
                    <Cell key={row.name} fill={row.accuracy >= 90 ? '#0f9b64' : row.accuracy >= 70 ? '#e08a00' : '#d93a3f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-card">
        <div className="hair-b px-6 py-4">
          <span className="label label-ink">Per-category breakdown</span>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="hair-b text-left">
              <th className="label px-6 py-3 font-normal">Category</th>
              <th className="label px-3 py-3 font-normal">Complaints</th>
              <th className="label px-3 py-3 font-normal">Transferred</th>
              <th className="label px-6 py-3 text-right font-normal">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {perCategory.map((row) => (
              <tr key={row.name}>
                <td className="px-6 py-3">{row.name}</td>
                <td className="mono px-3 py-3 text-ink-soft">{row.total}</td>
                <td className="mono px-3 py-3 text-ink-soft">{row.transferred}</td>
                <td className="px-6 py-3 text-right">
                  <span className={`mono ${row.accuracy >= 90 ? 'text-green' : row.accuracy >= 70 ? 'text-amber' : 'text-red'}`}>
                    {row.accuracy}%
                  </span>
                </td>
              </tr>
            ))}
            {perCategory.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-ink-soft">No data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
