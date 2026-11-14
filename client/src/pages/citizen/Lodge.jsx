import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { api, ApiError } from '../../lib/api.js'
import { useDebounce } from '../../hooks/useMotion.js'
import { useSpeech } from '../../hooks/useSpeech.js'
import { getCurrentPosition } from '../../lib/image.js'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Textarea } from '../../components/ui/Field.jsx'
import { SectionLabel, Spinner } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { LiveAiCard } from '../../components/domain/LiveAiCard.jsx'
import { LocationPicker } from '../../components/domain/LocationPicker.jsx'
import { PhotoDrop } from '../../components/domain/PhotoDrop.jsx'
import { IconMic, IconMap, IconCheck, IconAlert, IconArrow } from '../../components/ui/Icons.jsx'

const CITY = { lat: 18.5204, lng: 73.8567 }

export default function Lodge() {
  const { t, speechLang } = useI18n()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [coords, setCoords] = useState(CITY)
  const [ward, setWard] = useState(null)
  const [categoryIdOverride, setCategoryIdOverride] = useState('')
  const [categories, setCategories] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [joinBusy, setJoinBusy] = useState(false)

  const speech = useSpeech({ lang: speechLang })
  const debouncedText = useDebounce(text, 1200)

  useEffect(() => {
    api.get('/api/meta/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }, [])

  // Live AI preview (debounced 1.2s).
  useEffect(() => {
    const trimmed = debouncedText.trim()
    if (trimmed.length < 6) {
      setPreview(null)
      return
    }
    let alive = true
    setPreviewLoading(true)
    api
      .post('/api/ai/preview', { text: trimmed, lat: coords.lat, lng: coords.lng })
      .then((data) => {
        if (alive) {
          setPreview(data)
          setWard(data.ward)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setPreviewLoading(false)
      })
    return () => {
      alive = false
    }
  }, [debouncedText, coords.lat, coords.lng])

  const toggleVoice = useCallback(() => {
    if (speech.listening) {
      speech.stop()
      return
    }
    if (!speech.supported) {
      toast(t('lodge.voiceUnsupported'), { tone: 'amber' })
      return
    }
    speech.start({
      onResult: (transcript) => setText(transcript),
      langOverride: speechLang,
    })
  }, [speech, speechLang, t, toast])

  useEffect(() => {
    if (speech.error === 'not-allowed' || speech.error === 'service-not-allowed') {
      toast(t('lodge.voiceDenied'), { tone: 'red' })
    } else if (speech.error && speech.error !== 'unsupported') {
      toast(t('lodge.voiceFailed'), { tone: 'red' })
    }
  }, [speech.error, t, toast])

  async function locate() {
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    } catch {
      toast(t('lodge.gpsDenied'), { tone: 'amber' })
    } finally {
      setLocating(false)
    }
  }

  async function handleJoin(duplicate) {
    if (!user) {
      toast('Sign in to add your voice to an existing issue.', { tone: 'amber' })
      navigate('/login', { state: { from: '/lodge' } })
      return
    }
    setJoinBusy(true)
    try {
      const data = await api.post('/api/complaints/join', { issueId: duplicate.issueId, note: text })
      setResult({ complaint: data.complaint, joined: true })
      toast(t('lodge.dupJoined'), { tone: 'green' })
    } catch (err) {
      toast(err.message || t('common.somethingWrong'), { tone: 'red' })
    } finally {
      setJoinBusy(false)
    }
  }

  async function submit() {
    if (!user) {
      toast(t('lodge.signInRequired'), { tone: 'amber' })
      navigate('/login', { state: { from: '/lodge' } })
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('text', text.trim())
      form.append('lat', String(coords.lat))
      form.append('lng', String(coords.lng))
      if (categoryIdOverride) form.append('categoryId', categoryIdOverride)
      if (photos[0]) form.append('photo', photos[0])
      const data = await api.upload('/api/complaints', form)
      setResult({ complaint: data.complaint })
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, { tone: 'red' })
      else toast(t('common.somethingWrong'), { tone: 'red' })
    } finally {
      setSubmitting(false)
    }
  }

  const canNext = useMemo(() => text.trim().length >= 10, [text])

  // -------- success screen --------
  if (result?.complaint) {
    return (
      <div className="frame py-16">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green/12 text-green">
            <IconCheck size={30} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">
            {result.joined ? t('lodge.dupJoined') : t('lodge.successTitle')}
          </h1>
          <p className="mt-3 text-[14px] text-ink-soft">{t('lodge.successBody')}</p>

          <div className="card card-shadow mt-8 p-6 text-left">
            <div className="label">{t('track.share')}</div>
            <div className="mono mt-2 text-2xl font-medium tracking-wide">{result.complaint.code}</div>
            <div className="hair-t mt-5 grid grid-cols-2 gap-4 pt-5">
              <div>
                <div className="label">{t('lodge.aiCategory')}</div>
                <div className="mt-1 text-[13.5px]">{result.complaint.category?.name}</div>
              </div>
              <div>
                <div className="label">{t('track.department')}</div>
                <div className="mt-1 text-[13.5px]">{result.complaint.department?.name}</div>
              </div>
              <div>
                <div className="label">{t('lodge.aiPriority')}</div>
                <div className="mt-1 text-[13.5px]">
                  {result.complaint.priority} · {result.complaint.priorityBand}
                </div>
              </div>
              <div>
                <div className="label">{t('lodge.aiDeadline')}</div>
                <div className="mt-1 text-[13.5px]">{result.complaint.sla?.label}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to={`/track/${result.complaint.code}`} variant="saffron">
              {t('lodge.trackNow')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null)
                setStep(1)
                setText('')
                setPhotos([])
                setPreview(null)
                setCategoryIdOverride('')
              }}
            >
              {t('lodge.another')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // -------- form --------
  const steps = [t('lodge.step1'), t('lodge.step2'), t('lodge.step3')]

  return (
    <div className="frame py-10">
      <SectionLabel index={3} right={<Pill tone="blue">AI single window</Pill>}>
        {t('lodge.title')}
      </SectionLabel>
      <h1 className="max-w-2xl font-display text-4xl leading-[1.02] tracking-tight md:text-5xl">{t('lodge.sub')}</h1>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {/* step bar */}
          <ol className="hair-b mb-8 flex gap-2 pb-4">
            {steps.map((label, i) => {
              const n = i + 1
              const active = step === n
              const done = step > n
              return (
                <li key={label} className="flex flex-1 items-center gap-3">
                  <span
                    className={`mono grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] ${
                      active ? 'border-ink bg-ink text-paper' : done ? 'border-green bg-green text-white' : 'border-line text-ink-faint'
                    }`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <span className={`label ${active ? 'label-ink' : ''} hidden sm:block`}>{label}</span>
                </li>
              )
            })}
          </ol>

          {step === 1 && (
            <div className="space-y-5">
              <Field label={t('lodge.describeLabel')} hint="min 10 characters" htmlFor="problem">
                <Textarea
                  id="problem"
                  rows={7}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('lodge.placeholder')}
                  className="text-[15px]"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`btn btn-sm ${speech.listening ? 'btn-danger' : 'btn-ghost'}`}
                  disabled={!speech.supported}
                >
                  <IconMic size={16} />
                  {speech.listening ? t('lodge.voiceStop') : t('lodge.voice')}
                </button>
                {speech.listening && <span className="label text-red">{t('lodge.voiceListening')}</span>}
                {!speech.supported && <span className="label">{t('lodge.voiceUnsupported')}</span>}
                <span className="ml-auto label tabular">{text.trim().length} chars</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-faint">{t('lodge.describeHint')}</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="label label-ink">{t('lodge.location')}</span>
                  <Button size="sm" variant="ghost" onClick={locate} disabled={locating} icon={locating ? <Spinner /> : <IconMap size={15} />}>
                    {t('lodge.useGps')}
                  </Button>
                </div>
                <LocationPicker lat={coords.lat} lng={coords.lng} onChange={(lat, lng) => setCoords({ lat, lng })} />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="mono text-[11px] text-ink-faint">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                  {ward && <Pill tone="blue">{t('lodge.ward')} · {ward.name}</Pill>}
                </div>
                <p className="mt-2 text-[12.5px] text-ink-faint">{t('lodge.locationHint')}</p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="label label-ink">{t('lodge.photos')}</span>
                  <span className="label">{photos.length}/3</span>
                </div>
                <PhotoDrop files={photos} onChange={setPhotos} label={t('lodge.addPhoto')} />
                <p className="mt-2 text-[12.5px] text-ink-faint">{t('lodge.photosHint')}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="label">{t('lodge.describeLabel')}</div>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{text}</p>
                {preview?.ai?.englishText && preview.ai.englishText !== text && (
                  <div className="hair-t mt-4 pt-4">
                    <div className="label">{t('lodge.translation')}</div>
                    <p className="mt-1.5 text-[13px] italic text-ink-soft">{preview.ai.englishText}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="label">{t('lodge.ward')}</div>
                  <div className="mt-1 text-[13.5px]">{ward?.name || '—'}</div>
                </div>
                <div className="card p-4">
                  <div className="label">{t('lodge.photos')}</div>
                  <div className="mt-1 text-[13.5px]">{photos.length} attached</div>
                </div>
              </div>
              {photos[0] && (
                <img src={URL.createObjectURL(photos[0])} alt="Attachment" className="h-40 w-full rounded-xl border border-line object-cover" />
              )}
              <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                <IconAlert size={15} className="mt-0.5 shrink-0" />
                You can still change the AI's category on the card. Your correction is saved and helps us improve routing.
              </p>
            </div>
          )}

          {/* nav */}
          <div className="hair-t mt-8 flex items-center justify-between pt-5">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="btn btn-ghost btn-sm"
            >
              {t('common.back')}
            </button>
            {step < 3 ? (
              <Button variant="solid" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext} iconRight={<IconArrow size={16} />}>
                {t('common.next')}
              </Button>
            ) : (
              <Button variant="saffron" onClick={submit} disabled={submitting || !canNext}>
                {submitting ? <Spinner /> : t('common.submit')}
              </Button>
            )}
          </div>
        </div>

        {/* AI card */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <LiveAiCard
              preview={preview}
              loading={previewLoading}
              categories={categories}
              selectedCategoryId={categoryIdOverride}
              onCorrect={setCategoryIdOverride}
              onJoinDuplicate={handleJoin}
              duplicateBusy={joinBusy}
            />
            <p className="mt-4 text-center text-[12px] text-ink-faint">
              {t('lodge.aiLowConfidence')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
