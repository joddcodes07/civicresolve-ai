import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { api, uploadUrl, ApiError } from '../../lib/api.js'
import { useFetch } from '../../hooks/useFetch.js'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Textarea, Select } from '../../components/ui/Field.jsx'
import { SectionLabel, Spinner, EmptyState, Skeleton } from '../../components/ui/Primitives.jsx'
import { Pill, StatusPill, BandPill, PriorityScore, EscalationPill, SlaTag } from '../../components/ui/Pills.jsx'
import { SlaRing } from '../../components/ui/SlaRing.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Timeline } from '../../components/domain/Timeline.jsx'
import { BeforeAfter } from '../../components/domain/BeforeAfter.jsx'
import { PhotoDrop } from '../../components/domain/PhotoDrop.jsx'
import { LocationPicker } from '../../components/domain/LocationPicker.jsx'
import { IconCheck, IconSwap, IconAlert, IconSend } from '../../components/ui/Icons.jsx'
import { formatDateTime, timeAgo } from '../../lib/format.js'

const VAGUE = ['forwarded', 'under process', 'in process', 'noted', 'done', 'no issue', 'pending', 'will check']

export default function ComplaintDetail() {
  const { t } = useI18n()
  const { id } = useParams()
  const { toast } = useToast()
  const navigate = useNavigate()

  const { data, loading, reload } = useFetch(`/api/complaints/${id}`)
  const { data: deptData } = useFetch('/api/meta/departments')

  const [resolveOpen, setResolveOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [note, setNote] = useState('')
  const [afterPhotos, setAfterPhotos] = useState([])
  const [transferDept, setTransferDept] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverIssues, setServerIssues] = useState([])
  const [reply, setReply] = useState('')

  const complaint = data?.complaint

  const noteIssues = useMemo(() => {
    const issues = []
    const trimmed = note.trim()
    if (trimmed.length < 20) issues.push(`Note must be at least 20 characters (currently ${trimmed.length}).`)
    if (trimmed && VAGUE.some((v) => trimmed.toLowerCase().includes(v)) && trimmed.split(/\s+/).length < 8) {
      issues.push('Note is too vague — say what was actually done.')
    }
    if (afterPhotos.length === 0) issues.push('An after-photo is required.')
    return issues
  }, [note, afterPhotos])

  const markInProgress = useCallback(async () => {
    setBusy(true)
    try {
      await api.patch(`/api/complaints/${id}/status`, { toStatus: 'IN_PROGRESS', note: 'Work started on site.' })
      toast('Marked as in progress.', { tone: 'blue' })
      reload(true)
    } catch (err) {
      toast(err.message, { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }, [id, reload, toast])

  async function submitResolve() {
    if (noteIssues.length) return
    setBusy(true)
    setServerIssues([])
    try {
      const form = new FormData()
      form.append('photo', afterPhotos[0])
      const uploaded = await api.upload(`/api/complaints/${id}/photo`, form)

      await api.patch(`/api/complaints/${id}/status`, {
        toStatus: 'RESOLVED',
        note: note.trim(),
        photoUrl: uploaded.url,
      })
      toast('Resolved with proof. Waiting for the citizen to confirm.', { tone: 'green' })
      setResolveOpen(false)
      setNote('')
      setAfterPhotos([])
      reload(true)
    } catch (err) {
      if (err instanceof ApiError && err.reasons?.length) setServerIssues(err.reasons)
      else toast(err.message || 'Could not resolve.', { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  async function submitTransfer() {
    setBusy(true)
    try {
      await api.post(`/api/complaints/${id}/transfer`, { toDepartmentId: transferDept, reason: transferReason.trim() })
      toast('Transferred to the correct department.', { tone: 'blue' })
      setTransferOpen(false)
      setTransferReason('')
      reload(true)
    } catch (err) {
      toast(err.message || 'Could not transfer.', { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    try {
      await api.post(`/api/complaints/${id}/messages`, { body: reply.trim() })
      setReply('')
      reload(true)
    } catch (err) {
      toast(err.message, { tone: 'red' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!complaint) {
    return <EmptyState title="Complaint not found" body="It may have been removed, or you may not have access." action={<Button to="/officer" variant="ghost" size="sm" className="mt-2">Back to queue</Button>} />
  }

  const backTo = window.location.pathname.startsWith('/admin') ? '/admin/complaints' : '/officer'
  const canAct = ['ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'NEEDS_REVIEW'].includes(complaint.status)

  return (
    <div>
      <button onClick={() => navigate(backTo)} className="label text-ink-soft hover:text-ink">
        ← Back
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-[12px] tracking-wider text-ink-faint">{complaint.code}</span>
            <StatusPill status={complaint.status} />
            <BandPill band={complaint.priorityBand} />
            <EscalationPill level={complaint.escalationLevel} label={complaint.escalationLabel} />
          </div>
          <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight tracking-tight">{complaint.category?.name}</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {complaint.department?.name} · {complaint.ward?.name} · reported {timeAgo(complaint.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SlaTag sla={complaint.sla} />
          <PriorityScore score={complaint.priority} band={complaint.priorityBand} size="lg" />
        </div>
      </div>

      {canAct && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="blue" onClick={markInProgress} disabled={busy || complaint.status === 'IN_PROGRESS'}>
            {t('officer.markInProgress')}
          </Button>
          <Button variant="green" onClick={() => setResolveOpen(true)} icon={<IconCheck size={16} />}>
            {t('officer.resolve')}
          </Button>
          <Button variant="ghost" onClick={() => setTransferOpen(true)} icon={<IconSwap size={16} />}>
            {t('officer.transfer')}
          </Button>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="card p-6">
            <SectionLabel>Citizen's report</SectionLabel>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{complaint.originalText}</p>
            {complaint.englishText && complaint.englishText !== complaint.originalText && (
              <div className="hair-t mt-4 pt-4">
                <div className="label">{t('lodge.translation')} · {complaint.language}</div>
                <p className="mt-1.5 text-[13.5px] italic text-ink-soft">{complaint.englishText}</p>
              </div>
            )}
            {complaint.photoUrl && (
              <img src={uploadUrl(complaint.photoUrl)} alt="Reported" className="mt-4 max-h-72 w-full rounded-xl border border-line object-cover" />
            )}
          </div>

          <div className="card p-6">
            <SectionLabel right={<Pill tone={complaint.aiConfidence >= 0.6 ? 'green' : 'saffron'}>AI {Math.round(complaint.aiConfidence * 100)}%</Pill>}>
              Why this priority
            </SectionLabel>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="mono tabular text-2xl">{complaint.priority}</span>
              <span className="label">/ 100</span>
            </div>
            <p className="mt-3 text-[13px] text-ink-soft">{complaint.priorityReason}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {complaint.safetyRisk && <Pill tone="red">Safety risk</Pill>}
              <Pill tone="ink">Severity {complaint.severity}/5</Pill>
              <Pill tone="ink">{complaint.routingSource}</Pill>
              {complaint.reportCount > 1 && <Pill tone="blue">{complaint.reportCount} reports merged</Pill>}
            </div>
          </div>

          {(complaint.photoUrl || complaint.afterPhotoUrl) && (
            <div className="card p-6">
              <SectionLabel>Before / after</SectionLabel>
              <BeforeAfter before={uploadUrl(complaint.photoUrl)} after={uploadUrl(complaint.afterPhotoUrl)} />
            </div>
          )}

          <div className="card p-6">
            <SectionLabel>{t('track.timeline')}</SectionLabel>
            <Timeline history={complaint.history || []} />
          </div>

          <div className="card p-6">
            <SectionLabel>{t('track.conversation')}</SectionLabel>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {(complaint.messages || []).length === 0 && <p className="text-[13px] text-ink-soft">No messages yet.</p>}
              {(complaint.messages || []).map((m) => (
                <div key={m.id} className={`flex ${m.senderRole === 'CITIZEN' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] ${m.senderRole === 'CITIZEN' ? 'bg-paper-2' : 'bg-ink text-paper'}`}>
                    <div className="label mb-1 opacity-60">{m.senderName || m.senderRole}</div>
                    {m.body}
                    <div className="label mt-1.5 opacity-50">{timeAgo(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="mt-4 flex items-center gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the citizen…" className="field flex-1" />
              <Button type="submit" size="sm" variant="solid" icon={<IconSend size={15} />} />
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="card p-6">
            <div className="flex justify-center">
              <SlaRing
                usedPct={complaint.sla.usedPct}
                colour={complaint.sla.colour}
                hoursLeft={complaint.sla.hoursLeft}
                breached={complaint.sla.breached}
                label={complaint.sla.breached ? 'overdue' : t('track.sla')}
              />
            </div>
            <div className="hair-t mt-5 space-y-3 pt-5">
              {[
                [t('track.deadline'), formatDateTime(complaint.dueAt)],
                [t('track.officer'), complaint.officer?.name || 'Unassigned'],
                [t('track.ward'), complaint.ward?.name],
                ['Reported', formatDateTime(complaint.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4">
                  <span className="label">{k}</span>
                  <span className="text-right text-[13px]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="hair-b px-6 py-4">
              <span className="label label-ink">Location</span>
            </div>
            <LocationPicker lat={complaint.lat} lng={complaint.lng} onChange={() => {}} height={220} />
          </div>

          {complaint.transfers?.length > 0 && (
            <div className="card p-6">
              <SectionLabel>Transfer history</SectionLabel>
              <ul className="space-y-3">
                {complaint.transfers.map((tr) => (
                  <li key={tr.id} className="text-[13px]">
                    <div className="text-ink-soft">
                      {tr.from} → <span className="text-ink">{tr.to}</span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-faint">{tr.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Resolve modal */}
      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title={t('officer.resolveTitle')}
        subtitle={t('officer.resolveSub')}
        footer={
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => { setResolveOpen(false); setTransferOpen(true) }} className="label text-ink-soft hover:text-ink">
              {t('officer.honest')}
            </button>
            <Button variant="green" onClick={submitResolve} disabled={busy || noteIssues.length > 0}>
              {busy ? <Spinner /> : t('officer.submitResolution')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label={t('officer.note')} hint={`${note.trim().length}/20 min`} required>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={t('officer.noteHint')} />
          </Field>
          <div>
            <div className="label label-ink mb-2">
              {t('officer.afterPhoto')} <span className="text-red">*</span>
            </div>
            <PhotoDrop files={afterPhotos} onChange={setAfterPhotos} max={1} label={t('officer.afterPhoto')} />
            <p className="mt-2 text-[12px] text-ink-faint">{t('officer.afterPhotoHint')}</p>
          </div>

          {(noteIssues.length > 0 || serverIssues.length > 0) && (
            <div className="rounded-xl border border-red/25 bg-red-soft p-4">
              <div className="flex items-center gap-2 text-red">
                <IconAlert size={16} />
                <span className="label text-red">{t('officer.blocked')}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {[...serverIssues, ...noteIssues].map((r) => (
                  <li key={r} className="text-[12.5px] text-red">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title={t('officer.transferTitle')}
        subtitle="Transfers are counted as AI corrections and improve routing accuracy."
        footer={
          <div className="flex justify-end">
            <Button
              variant="solid"
              onClick={submitTransfer}
              disabled={busy || !transferDept || transferReason.trim().length < 5}
            >
              {busy ? <Spinner /> : t('officer.transfer')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Department" required>
            <Select value={transferDept} onChange={(e) => setTransferDept(e.target.value)}>
              <option value="">Select the correct department…</option>
              {(deptData?.departments || [])
                .filter((d) => d.id !== complaint.department?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label={t('officer.transferReason')} required>
            <Textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} rows={3} placeholder="e.g. This is a drainage matter, not roads." />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
