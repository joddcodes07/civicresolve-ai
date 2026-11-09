import { useState } from 'react'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api } from '../../lib/api.js'
import { SectionLabel, Skeleton, EmptyState, Spinner } from '../../components/ui/Primitives.jsx'
import { Select } from '../../components/ui/Field.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Pill, StatusPill } from '../../components/ui/Pills.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { timeAgo } from '../../lib/format.js'
import { IconSpark } from '../../components/ui/Icons.jsx'

export default function AdminReview() {
  const { t } = useI18n()
  const { toast } = useToast()
  const { data, loading, reload } = useFetch('/api/admin/review')
  const { data: catData } = useFetch('/api/meta/categories')
  const [choices, setChoices] = useState({})
  const [busy, setBusy] = useState(null)

  const complaints = data?.complaints || []
  const categories = catData?.categories || []

  async function assign(complaint) {
    const categoryId = choices[complaint.id]
    if (!categoryId) return
    setBusy(complaint.id)
    try {
      await api.post(`/api/admin/review/${complaint.id}/assign`, { categoryId })
      toast('Routed to the department.', { tone: 'green' })
      reload(true)
    } catch (err) {
      toast(err.message || 'Could not route.', { tone: 'red' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <SectionLabel index={4} right={<Pill tone="saffron">{complaints.length} waiting</Pill>}>
        {t('admin.tab.review')}
      </SectionLabel>
      <h1 className="max-w-3xl font-display text-3xl tracking-tight md:text-4xl">{t('admin.reviewQueue')}</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">
        The AI was below 60% confidence on these, so it did not guess. Pick the right category and it is
        routed immediately. Every manual choice teaches the routing engine.
      </p>

      <div className="mt-8 space-y-4">
        {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}

        {!loading && complaints.length === 0 && (
          <EmptyState title="Nothing needs review" body="The AI was confident about every recent complaint." />
        )}

        {complaints.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[11px] text-ink-faint">{c.code}</span>
                  <StatusPill status={c.status} />
                  <Pill tone="saffron">
                    <IconSpark size={12} /> {Math.round(c.aiConfidence * 100)}% confident
                  </Pill>
                  <span className="label">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-2.5 text-[14px] leading-relaxed">{c.originalText}</p>
                {c.englishText && c.englishText !== c.originalText && (
                  <p className="mt-1.5 text-[12.5px] italic text-ink-soft">{c.englishText}</p>
                )}
                <div className="mt-2 text-[12px] text-ink-faint">
                  AI guessed: {c.category?.name} · {c.department?.name}
                </div>
              </div>
              <div className="w-full max-w-xs space-y-3">
                <Select
                  value={choices[c.id] || ''}
                  onChange={(e) => setChoices((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  aria-label={t('admin.assignTo')}
                >
                  <option value="">{t('admin.assignTo')}…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} · {cat.department?.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="solid"
                  block
                  disabled={!choices[c.id] || busy === c.id}
                  onClick={() => assign(c)}
                >
                  {busy === c.id ? <Spinner /> : t('admin.assign')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
