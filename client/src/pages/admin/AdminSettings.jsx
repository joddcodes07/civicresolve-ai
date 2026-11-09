import { useEffect, useState } from 'react'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api } from '../../lib/api.js'
import { SectionLabel, Skeleton, Spinner } from '../../components/ui/Primitives.jsx'
import { Field, Input } from '../../components/ui/Field.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

export default function AdminSettings() {
  const { t } = useI18n()
  const { toast } = useToast()
  const { data, loading, reload } = useFetch('/api/admin/settings')
  const [slas, setSlas] = useState({})
  const [settings, setSettings] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data) {
      setSettings(data.settings || {})
      setSlas(Object.fromEntries((data.departments || []).map((d) => [d.id, d.slaHours])))
    }
  }, [data])

  async function save() {
    setBusy(true)
    try {
      await api.put('/api/admin/settings', {
        settings,
        departmentSlas: Object.entries(slas).map(([id, slaHours]) => ({ id, slaHours: Number(slaHours) })),
      })
      toast(t('admin.saved'), { tone: 'green' })
      reload(true)
    } catch (err) {
      toast(err.message || 'Could not save.', { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const departments = data?.departments || []

  return (
    <div>
      <SectionLabel index={8}>{t('admin.settingsTitle')}</SectionLabel>
      <h1 className="font-display text-3xl tracking-tight md:text-4xl">Tune how the city operates.</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
        Deadlines, the weighting of the performance index and the duplicate threshold. Every number here is
        a policy decision the administration controls.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-7">
          <SectionLabel>{t('admin.slaHours')}</SectionLabel>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-3">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13.5px]">{d.name}</div>
                    <div className="mono mt-0.5 text-[10.5px] text-ink-faint">{d.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={slas[d.id] ?? ''}
                      onChange={(e) => setSlas((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="field w-20 text-center"
                    />
                    <span className="label">hours</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 lg:col-span-5">
          <SectionLabel>Engine & policy</SectionLabel>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-5">
              <Field label="Confirm window (days)" hint="auto-confirm if no reply">
                <Input
                  type="number"
                  value={settings.confirmWindowDays ?? ''}
                  onChange={(e) => setSettings((s) => ({ ...s, confirmWindowDays: e.target.value }))}
                />
              </Field>
              <Field label="Duplicate similarity threshold" hint="0 – 1">
                <Input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="1"
                  value={settings.similarityThreshold ?? ''}
                  onChange={(e) => setSettings((s) => ({ ...s, similarityThreshold: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['dpiWeightOnTime', 'On-time'],
                  ['dpiWeightVrr', 'Verified'],
                  ['dpiWeightRating', 'Rating'],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings[key] ?? ''}
                      onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                    />
                  </Field>
                ))}
              </div>
              <p className="text-[12px] text-ink-faint">
                DPI weights should sum to 1.0. They are applied as
                {' '}on-time + verified + rating.
              </p>
            </div>
          )}

          <div className="hair-t mt-6 flex justify-end pt-5">
            <Button variant="solid" onClick={save} disabled={busy}>
              {busy ? <Spinner /> : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
