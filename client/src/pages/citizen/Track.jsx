import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { api, uploadUrl } from '../../lib/api.js'
import { joinComplaint } from '../../lib/socket.js'
import { useSocketEvent } from '../../hooks/useSocketEvent.js'
import { Button } from '../../components/ui/Button.jsx'
import { Pill, StatusPill, BandPill, PriorityScore, EscalationPill } from '../../components/ui/Pills.jsx'
import { SectionLabel, Spinner, EmptyState } from '../../components/ui/Primitives.jsx'
import { SlaRing } from '../../components/ui/SlaRing.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Timeline } from '../../components/domain/Timeline.jsx'
import { BeforeAfter } from '../../components/domain/BeforeAfter.jsx'
import { IconCheck, IconClose, IconSend } from '../../components/ui/Icons.jsx'
import { formatDateTime, timeAgo } from '../../lib/format.js'

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`text-xl transition-colors ${n <= (value || 0) ? 'text-saffron' : 'text-ink-ghost'}`}
          aria-label={`${n} star`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function Track() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { code: paramCode } = useParams()

  const [input, setInput] = useState(paramCode || '')
  const [complaint, setComplaint] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(Boolean(paramCode))
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rating, setRating] = useState(0)
  const [reply, setReply] = useState('')
  const [confirming, setConfirming] = useState(false)

  const code = complaint?.code

  const load = useCallback(
    async (targetCode, silent = false) => {
      if (!targetCode) return
      if (!silent) setLoading(true)
      try {
        const data = await api.get(`/api/complaints/track/${targetCode}`)
        setComplaint(data.complaint)
        setMessages(data.complaint.messages || [])
        setNotFound(false)
      } catch {
        setNotFound(true)
        setComplaint(null)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (paramCode) load(paramCode)
  }, [paramCode, load])

  // Live updates for this complaint.
  useEffect(() => {
    if (code) joinComplaint(code)
  }, [code])

  useSocketEvent(
    'complaint:update',
    (payload) => {
      if (payload.code === code) {
        toast(`Update: ${payload.statusLabel}${payload.note ? ` — ${payload.note}` : ''}`, { tone: 'blue' })
        load(code, true)
      }
    },
    [code],
  )

  useSocketEvent(
    'message:new',
    (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
    },
    [code],
  )

  function submitSearch(e) {
    e.preventDefault()
    const trimmed = input.trim().toUpperCase()
    if (trimmed) navigate(`/track/${trimmed}`)
  }

  async function sendFeedback(confirmed) {
    if (!user) {
      toast('Sign in to confirm or reopen your complaint.', { tone: 'amber' })
      navigate('/login', { state: { from: `/track/${code}` } })
      return
    }
    setBusy(true)
    try {
      const data = await api.post(`/api/complaints/${complaint.id}/feedback`, {
        confirmed,
        rating: rating || undefined,
      })
      setComplaint(data.complaint)
      setConfirming(false)
      if (confirmed) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#0f9b64', '#2f5bea', '#f28c28'] })
        toast(t('track.thanks'), { tone: 'green' })
      } else {
        toast(t('track.reopen'), { tone: 'red' })
      }
      load(code, true)
    } catch (err) {
      toast(err.message || t('common.somethingWrong'), { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!reply.trim()) return
    if (!user) {
      navigate('/login', { state: { from: `/track/${code}` } })
      return
    }
    try {
      const data = await api.post(`/api/complaints/${complaint.id}/messages`, { body: reply.trim() })
      setMessages((prev) => [...prev, { ...data.message, senderName: user.name }])
      setReply('')
    } catch (err) {
      toast(err.message || t('common.somethingWrong'), { tone: 'red' })
    }
  }

  const isClosed = complaint && ['CONFIRMED'].includes(complaint.status)
  const awaitingConfirm = complaint?.status === 'RESOLVED'

  const photoBefore = useMemo(() => uploadUrl(complaint?.photoUrl), [complaint?.photoUrl])
  const photoAfter = useMemo(() => uploadUrl(complaint?.afterPhotoUrl), [complaint?.afterPhotoUrl])

  return (
    <div className="frame py-10">
      <SectionLabel index={4} right={<Pill tone="blue">{t('track.sub')}</Pill>}>
        {t('track.title')}
      </SectionLabel>

      <form onSubmit={submitSearch} className="flex max-w-lg items-center gap-2 rounded-full border border-line bg-card p-1.5 pl-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('track.placeholder')}
          className="mono min-w-0 flex-1 bg-transparent text-[13px] uppercase outline-none placeholder:text-ink-ghost"
          aria-label={t('track.placeholder')}
        />
        <Button type="submit" variant="solid" size="sm">
          {t('track.find')}
        </Button>
      </form>

      {loading && (
        <div className="mt-16 flex justify-center">
          <Spinner className="text-ink-faint" />
        </div>
      )}

      {notFound && !loading && (
        <div className="mt-12">
          <EmptyState title={t('track.notFound')} body="Check the ID and try again — it looks like CR-2026-000123." />
        </div>
      )}

      {complaint && !loading && (
        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {/* Confirm / reopen banner */}
            {awaitingConfirm && (
              <div className="card card-shadow mb-6 border-violet/30 bg-violet/5 p-5">
                <div className="label text-violet">{t('track.yourSay')}</div>
                <p className="mt-2 text-[14px] leading-relaxed">
                  The department says this is fixed. Please confirm, or reopen it if it is not.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="green" onClick={() => setConfirming(true)} icon={<IconCheck size={16} />}>
                    {t('track.confirmFix')}
                  </Button>
                  <Button variant="danger" onClick={() => sendFeedback(false)} disabled={busy} icon={<IconClose size={16} />}>
                    {t('track.reopen')}
                  </Button>
                </div>
                {complaint.confirmsAt && <p className="mt-3 text-[12px] text-ink-faint">{t('track.autoConfirm', { days: 7 })}</p>}
              </div>
            )}

            {confirming && (
              <div className="card card-shadow mb-6 p-5">
                <div className="label">{t('track.rateQuestion')}</div>
                <div className="mt-2">
                  <Stars value={rating} onChange={setRating} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="green" size="sm" onClick={() => sendFeedback(true)} disabled={busy}>
                    {busy ? <Spinner /> : t('chat.submit')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {complaint.status === 'CONFIRMED' && (
              <div className="card mb-6 border-green/30 bg-green-soft/60 p-5">
                <div className="flex items-center gap-2 text-green">
                  <IconCheck size={18} />
                  <span className="label text-green">Verified fixed · closed</span>
                </div>
                {complaint.feedback?.rating ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={complaint.feedback.rating} />
                    <span className="label">your rating</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Timeline */}
            <div className="card p-6">
              <SectionLabel>{t('track.timeline')}</SectionLabel>
              <Timeline history={complaint.history || []} />
            </div>

            {/* Proof */}
            {(photoBefore || photoAfter) && (
              <div className="card mt-6 p-6">
                <SectionLabel>{t('track.beforeAfter')}</SectionLabel>
                <BeforeAfter before={photoBefore} after={photoAfter} />
                {!photoAfter && <p className="mt-3 text-[12.5px] text-ink-faint">{t('track.awaitingPhoto')}</p>}
              </div>
            )}

            {/* Conversation */}
            <div className="card mt-6 p-6">
              <SectionLabel>{t('track.conversation')}</SectionLabel>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 && <p className="text-[13px] text-ink-soft">No messages yet.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'CITIZEN' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] ${m.senderRole === 'CITIZEN' ? 'bg-ink text-paper' : 'bg-paper-2'}`}>
                      <div className="label mb-1 opacity-60">{m.senderName || m.senderRole}</div>
                      {m.body}
                      <div className="label mt-1.5 opacity-50">{timeAgo(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t('track.messagePlaceholder')}
                  className="field flex-1"
                />
                <Button type="submit" variant="solid" size="sm" icon={<IconSend size={15} />}>
                  {t('track.send')}
                </Button>
              </form>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="card card-shadow p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="label">Complaint ID</div>
                    <div className="mono mt-1 text-xl font-medium tracking-wide">{complaint.code}</div>
                  </div>
                  <PriorityScore score={complaint.priority} band={complaint.priorityBand} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusPill status={complaint.status} />
                  <BandPill band={complaint.priorityBand} />
                  <EscalationPill level={complaint.escalationLevel} label={complaint.escalationLabel} />
                </div>
                <div className="hair-t mt-5 flex items-center justify-center pt-5">
                  <SlaRing
                    usedPct={complaint.sla.usedPct}
                    colour={complaint.sla.colour}
                    hoursLeft={complaint.sla.hoursLeft}
                    breached={complaint.sla.breached}
                    label={complaint.sla.breached ? 'overdue' : t('track.sla')}
                  />
                </div>
              </div>

              <div className="card p-6">
                <SectionLabel>Details</SectionLabel>
                <dl className="space-y-4">
                  {[
                    ['Category', complaint.category?.name],
                    [t('track.department'), complaint.department?.name],
                    [t('track.ward'), complaint.ward?.name],
                    [t('track.officer'), complaint.officer?.name],
                    [t('lodge.aiPriority'), `${complaint.priority} · ${complaint.priorityBand}`],
                    [t('lodge.aiConfidence'), `${Math.round(complaint.aiConfidence * 100)}%`],
                    [t('track.deadline'), formatDateTime(complaint.dueAt)],
                    ['Reported', formatDateTime(complaint.createdAt)],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4">
                        <dt className="label">{k}</dt>
                        <dd className="text-right text-[13px]">{v}</dd>
                      </div>
                    ))}
                </dl>
                {complaint.issue && complaint.reportCount > 1 && (
                  <div className="hair-t mt-5 pt-4">
                    <Pill tone="blue">{t('track.reports', { n: complaint.reportCount })}</Pill>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <SectionLabel>What the citizen said</SectionLabel>
                <p className="text-[13.5px] leading-relaxed">{complaint.originalText}</p>
                {complaint.englishText && complaint.englishText !== complaint.originalText && (
                  <div className="hair-t mt-4 pt-4">
                    <div className="label">{t('lodge.translation')}</div>
                    <p className="mt-1.5 text-[13px] italic text-ink-soft">{complaint.englishText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
