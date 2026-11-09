import { Pill, BandPill, PriorityScore } from '../ui/Pills.jsx'
import { Select } from '../ui/Field.jsx'
import { Spinner } from '../ui/Primitives.jsx'
import { IconSpark, IconAlert } from '../ui/Icons.jsx'
import { useI18n } from '../../lib/i18n.jsx'
import { useToast } from '../ui/Toast.jsx'
import { formatDateTime } from '../../lib/format.js'

/** The live "AI understanding" card shown beside the lodge form. */
export function LiveAiCard({ preview, loading, categories = [], onCorrect, selectedCategoryId, onJoinDuplicate, duplicateBusy }) {
  const { t } = useI18n()
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="card card-shadow p-5">
        <div className="flex items-center gap-2 text-ink-soft">
          <Spinner />
          <span className="label">{t('lodge.aiAnalyzing')}</span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="shimmer h-7 w-2/3 rounded-lg" />
          <div className="shimmer h-4 w-1/2 rounded-lg" />
          <div className="shimmer h-16 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="card flex flex-col gap-3 border-dashed p-5">
        <div className="flex items-center gap-2">
          <IconSpark size={16} />
          <span className="label">{t('lodge.aiTitle')}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-soft">{t('lodge.aiIdle')}</p>
      </div>
    )
  }

  const { ai, priority, deadline, duplicate } = preview
  const confidencePct = Math.round((ai.confidence || 0) * 100)

  return (
    <div className="glass card-shadow overflow-hidden rounded-[14px]">
      <div className="hair-b flex items-center justify-between px-5 py-3">
        <span className="label label-ink flex items-center gap-2">
          <IconSpark size={14} /> {t('lodge.aiTitle')}
        </span>
        <Pill tone={ai.routingSource === 'llm' ? 'violet' : 'blue'}>{ai.routingSource === 'llm' ? 'LLM' : 'Local AI'}</Pill>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="label">{t('lodge.aiCategory')}</div>
          <div className="mt-1.5 font-display text-2xl leading-tight tracking-tight">{ai.categoryName}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill tone="ink">{ai.departmentName}</Pill>
            <Pill tone={ai.severity >= 4 ? 'red' : 'amber'}>Severity {ai.severity}/5</Pill>
            {ai.safetyRisk && <Pill tone="red">Safety risk</Pill>}
            <Pill tone="ink" className="normal-case">{ai.language}</Pill>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="label">{t('lodge.aiConfidence')}</span>
            <span className="mono tabular text-[12px]">{confidencePct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${confidencePct >= 60 ? 'bg-green' : 'bg-saffron'}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          {ai.needsReview && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-saffron">
              <IconAlert size={14} className="mt-0.5 shrink-0" />
              {t('lodge.aiLowConfidence')}
            </p>
          )}
        </div>

        <div className="flex items-start gap-4">
          <PriorityScore score={priority.score} band={priority.band} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="label">{t('lodge.aiPriority')}</span>
              <BandPill band={priority.band} />
            </div>
            <ul className="mt-2 space-y-1">
              {priority.reasons?.map((r) => (
                <li key={r.label} className="flex items-baseline justify-between gap-3 text-[12.5px] text-ink-soft">
                  <span>{r.label}</span>
                  <span className="mono tabular text-ink">+{r.points}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hair-t pt-4">
          <div className="label">{t('lodge.aiDeadline')}</div>
          <div className="mono mt-1 text-[13px]">{formatDateTime(deadline.dueAt)}</div>
          <div className="mt-0.5 text-[12px] text-ink-soft">{deadline.slaHours}h SLA for this department</div>
        </div>

        {duplicate && (
          <div className="rounded-xl border border-saffron/30 bg-saffron-soft p-4">
            <div className="label text-saffron">{t('lodge.dupTitle')}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed">
              {t('lodge.dupBody', { code: duplicate.complaintCode, distance: duplicate.distanceMetres })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onJoinDuplicate?.(duplicate)}
                disabled={duplicateBusy}
                className="btn btn-saffron btn-sm"
              >
                {duplicateBusy ? <Spinner /> : t('lodge.dupJoin')}
              </button>
              <button
                onClick={() => toast(t('lodge.dupSkip'), { tone: 'ink' })}
                className="btn btn-ghost btn-sm"
              >
                {t('lodge.dupSkip')}
              </button>
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="hair-t pt-4">
            <label className="label" htmlFor="ai-correct">
              {t('lodge.aiCorrection')}
            </label>
            <Select
              id="ai-correct"
              className="mt-2"
              value={selectedCategoryId || ''}
              onChange={(e) => onCorrect?.(e.target.value)}
            >
              <option value="">Keep AI choice — {ai.categoryName}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.department?.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveAiCard
