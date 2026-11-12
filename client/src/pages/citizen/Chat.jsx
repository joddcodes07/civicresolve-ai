import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { api } from '../../lib/api.js'
import { getCurrentPosition } from '../../lib/image.js'
import { compressImage } from '../../lib/image.js'
import { useSpeech } from '../../hooks/useSpeech.js'
import { Button } from '../../components/ui/Button.jsx'
import { SectionLabel, Spinner } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'
import { IconMic, IconSend, IconCamera, IconTrack } from '../../components/ui/Icons.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const CITY = { lat: 18.5204, lng: 73.8567 }

export default function Chat() {
  const { t, speechLang } = useI18n()
  const { toast } = useToast()

  const [messages, setMessages] = useState([])
  const [state, setState] = useState('ask_problem')
  const [draft, setDraft] = useState({ text: '', ai: null, lat: CITY.lat, lng: CITY.lng, photo: null, ward: null })
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState(null)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const speech = useSpeech({ lang: speechLang })

  useEffect(() => {
    setMessages([{ role: 'bot', text: t('chat.start') }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  function say(text) {
    setMessages((prev) => [...prev, { role: 'bot', text }])
  }

  async function handleSend(rawText) {
    if (thinking || state === 'done') return
    const value = (rawText ?? input).trim()
    if (state === 'ask_problem' && value.length < 10) {
      toast(t('chat.minDescription'), { tone: 'amber' })
      return
    }
    if (!value && state !== 'ask_photo') return
    if (value) setMessages((prev) => [...prev, { role: 'user', text: value }])
    setInput('')

    if (state === 'ask_problem') {
      setThinking(true)
      try {
        const data = await api.post('/api/ai/preview', { text: value, lat: draft.lat, lng: draft.lng })
        setDraft((d) => ({ ...d, text: value, ai: data.ai, ward: data.ward }))
        say(t('chat.askLocation', { category: data.ai.categoryName, department: data.ai.departmentName }))
        setState('ask_location')
      } catch {
        setInput(value)
        say(t('chat.previewUnavailable'))
      } finally {
        setThinking(false)
      }
      return
    }

    if (state === 'ask_location') {
      setDraft((d) => ({ ...d, locationNote: value }))
      say(t('chat.askPhoto'))
      setState('ask_photo')
      return
    }

    if (state === 'ask_photo') {
      say(t('chat.confirm', { category: draft.ai?.categoryName, department: draft.ai?.departmentName, priority: draft.ai?.severity }))
      setState('confirm')
      return
    }

    if (state === 'confirm') {
      await submitComplaint()
    }
  }

  async function shareLocation() {
    setMessages((prev) => [...prev, { role: 'user', text: t('chat.quickLocation') }])
    try {
      const pos = await getCurrentPosition()
      setDraft((d) => ({ ...d, lat: pos.coords.latitude, lng: pos.coords.longitude, locationNote: 'GPS' }))
      toast('Location captured.', { tone: 'green' })
    } catch {
      toast(t('lodge.gpsDenied'), { tone: 'amber' })
    }
    say(t('chat.askPhoto'))
    setState('ask_photo')
  }

  async function onPhotoPicked(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const compressed = await compressImage(file)
    setDraft((d) => ({ ...d, photo: compressed }))
    setMessages((prev) => [...prev, { role: 'user', text: t('chat.quickPhoto') }])
    say(t('chat.confirm', { category: draft.ai?.categoryName, department: draft.ai?.departmentName, priority: draft.ai?.severity }))
    setState('confirm')
  }

  function toggleVoice() {
    if (speech.listening) return speech.stop()
    speech.start({ onResult: (transcript) => setInput(transcript), langOverride: speechLang })
  }

  async function submitComplaint() {
    setThinking(true)
    try {
      const form = new FormData()
      form.append('text', draft.text || 'Complaint via Shikayat Saathi')
      form.append('lat', String(draft.lat))
      form.append('lng', String(draft.lng))
      if (draft.photo) form.append('photo', draft.photo)
      const data = await api.upload('/api/complaints', form)
      setResult(data.complaint)
      say(t('chat.done', { code: data.complaint.code }))
      setState('done')
    } catch (err) {
      say(err.message || t('common.somethingWrong'))
    } finally {
      setThinking(false)
    }
  }

  const chips =
    state === 'ask_location'
      ? [{ label: t('chat.quickLocation'), onClick: shareLocation }]
      : state === 'ask_photo'
        ? [
            { label: t('chat.quickPhoto'), onClick: () => fileRef.current?.click() },
            { label: t('chat.quickSkip'), onClick: () => handleSend(t('chat.quickSkip')) },
          ]
        : state === 'confirm'
          ? [{ label: t('chat.quickSubmit'), onClick: () => handleSend(t('chat.quickSubmit')), primary: true }]
          : state === 'ask_problem'
            ? ['chat.exampleRoad', 'chat.exampleLight', 'chat.exampleWaste'].map((key) => ({
                label: t(key), onClick: () => setInput(t(`${key}Text`)),
              }))
            : []

  return (
    <div className="frame py-10">
      <SectionLabel index={5} right={<Pill tone="violet">{t('chat.title')}</Pill>}>
        {t('chat.sub')}
      </SectionLabel>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="card card-shadow flex h-[560px] flex-col overflow-hidden">
            <div className="hair-b flex items-center gap-3 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
                <IconTrack size={17} />
              </span>
              <div>
                <div className="font-display text-[15px] font-semibold">{t('chat.title')}</div>
                <div className="label">AI assistant · {draft.ai?.language || 'multi'}</div>
              </div>
              {draft.ai && <Pill tone="blue" className="ml-auto">{draft.ai.categoryName}</Pill>}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === 'user' ? 'bg-ink text-paper' : 'bg-paper-2'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-paper-2 px-4 py-3">
                    <Spinner className="text-ink-faint" />
                    <span className="label">{t('chat.understood')}…</span>
                  </div>
                </div>
              )}
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 pb-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={thinking}
                    onClick={chip.onClick}
                    className={`pill border ${chip.primary ? 'border-saffron bg-saffron text-white' : 'border-line bg-card text-ink-soft hover:border-line-strong'}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="hair-t flex items-center gap-2 p-4"
            >
              <button type="button" onClick={toggleVoice} className={`btn btn-ghost btn-sm ${speech.listening ? 'btn-danger' : ''}`} aria-label="Voice">
                <IconMic size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="field flex-1"
                disabled={thinking || state === 'done'}
              />
              <Button type="submit" variant="solid" size="sm" disabled={thinking || state === 'done'} icon={<IconSend size={15} />} />
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoPicked} />
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card p-6">
            <SectionLabel>{t('lodge.aiTitle')}</SectionLabel>
            {draft.ai ? (
              <dl className="space-y-4">
                {[
                  [t('lodge.aiCategory'), draft.ai.categoryName],
                  [t('lodge.aiDepartment'), draft.ai.departmentName],
                  [t('lodge.aiConfidence'), `${Math.round(draft.ai.confidence * 100)}%`],
                  [t('lodge.aiPriority'), `${draft.ai.severity}/5 severity`],
                  [t('lodge.ward'), draft.ward?.name],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4">
                      <dt className="label">{k}</dt>
                      <dd className="text-right text-[13px]">{v}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-[13px] text-ink-soft">{t('lodge.aiIdle')}</p>
            )}

            {result && (
              <div className="hair-t mt-5 pt-5">
                <div className="label">Complaint ID</div>
                <div className="mono mt-1 text-lg">{result.code}</div>
                <Button to={`/track/${result.code}`} variant="saffron" size="sm" className="mt-3">
                  {t('lodge.trackNow')}
                </Button>
              </div>
            )}
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
            Prefer a form? <Link to="/lodge" className="link-sweep text-ink">Use the 3-step lodge page</Link> — same AI, same backend.
          </p>
        </div>
      </div>
    </div>
  )
}
