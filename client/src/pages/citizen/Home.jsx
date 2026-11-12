import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { useCountUp } from '../../hooks/useMotion.js'
import { Reveal } from '../../components/ui/Reveal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { SectionLabel, KpiCard, Hairline } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'
import { Marquee } from '../../components/ui/Marquee.jsx'
import { LivingMap } from '../../components/domain/LivingMap.jsx'
import { IconArrow, IconMic, IconSpark, IconTrack, IconShield } from '../../components/ui/Icons.jsx'

const DEPT_BLURBS = {
  ROADS: 'Potholes, footpaths, manholes',
  WATER: 'Supply, quality, pipelines',
  DRAINAGE: 'Drains, sewers, overflow',
  WASTE: 'Garbage, dumps, bins',
  LIGHTING: 'Streetlights, poles, wiring',
  HEALTH: 'Toilets, mosquitoes, strays',
  PARKS: 'Gardens, trees, playgrounds',
  TOWNPLAN: 'Encroachment, hoardings',
  BUILDING: 'Unsafe structures',
  TRAFFIC: 'Signals, parking, bus stops',
  FIRE: 'Fire hazards, emergencies',
  EDUCATION: 'Municipal schools',
  REVENUE: 'Certificates, property tax',
  OTHERS: 'Anything else',
}

function Counter({ value, label, suffix }) {
  const [count, ref] = useCountUp(value)
  return (
    <div ref={ref}>
      <div className="mono tabular text-3xl font-medium tracking-tight md:text-4xl">
        {count.toLocaleString('en-IN')}
        {suffix ? <span className="text-ink-faint">{suffix}</span> : null}
      </div>
      <div className="label mt-1">{label}</div>
    </div>
  )
}

export default function Home() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const { data: statsData, loading: statsLoading, error: statsError } = useFetch('/api/meta/stats?demo=1')
  const { data: issueData } = useFetch('/api/issues/map?demo=1')
  const { data: deptData } = useFetch('/api/meta/departments')

  const stats = statsData?.stats || {}
  const demo = statsData?.demoStats
  const issues = issueData?.issues || []
  const departments = deptData?.departments || []

  function trackSubmit(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed) navigate(`/track/${trimmed}`)
  }

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="frame pt-14 pb-10 md:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <span className="label">{t('home.kicker')}</span>
              </Reveal>
              <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.95] tracking-tight">
                <Reveal as="span" delay={80} className="block">
                  {t('home.headline.a')}
                </Reveal>
                <Reveal as="span" delay={180} className="block">
                  {t('home.headline.b')}
                </Reveal>
                <Reveal as="span" delay={280} className="block text-blue">
                  {t('home.headline.c')}
                </Reveal>
              </h1>
              <Reveal delay={360}>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{t('home.sub')}</p>
              </Reveal>

              <Reveal delay={440} className="mt-8 flex flex-wrap items-center gap-3">
                <Button to="/lodge" variant="saffron" size="lg">
                  {t('home.ctaLodge')}
                </Button>
                <Button to="/chat" variant="ghost" size="lg" icon={<IconMic size={18} />}>
                  {t('nav.chat')}
                </Button>
              </Reveal>

              <Reveal delay={520} className="mt-6">
                <form onSubmit={trackSubmit} className="flex max-w-md items-center gap-2 rounded-full border border-line bg-card p-1.5 pl-4">
                  <IconTrack size={17} className="shrink-0 text-ink-faint" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t('home.trackPlaceholder')}
                    className="mono min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-ink-ghost"
                    aria-label={t('home.trackPlaceholder')}
                  />
                  <button type="submit" className="btn btn-solid btn-sm shrink-0">
                    {t('track.find')}
                  </button>
                </form>
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              <Reveal delay={200}>
                <LivingMap issues={issues} demo={issueData?.demo} />
              </Reveal>
            </div>
          </div>
        </div>

        {/* department marquee */}
        <div className="hair-t hair-b py-3">
          <Marquee
            items={
              departments.length
                ? departments.map((d) => d.name)
                : ['Roads & Footpaths', 'Water Supply', 'Drainage', 'Solid Waste', 'Street Lighting', 'Public Health']
            }
          />
        </div>
      </section>

      {/* ---------------- LIVE COUNTERS ---------------- */}
      <section className="frame py-14">
        <SectionLabel index={1} right={statsData && <Pill tone={demo ? 'blue' : 'green'} dot>{demo ? t('common.demo') : 'Live'}</Pill>}>
          {demo ? t('home.demoTitle') : t('home.liveTitle')}
        </SectionLabel>
        {statsError ? (
          <p role="status" className="text-ink-soft">{t('home.statsUnavailable')}</p>
        ) : statsLoading || !statsData ? (
          <p role="status" className="text-ink-soft">{t('home.statsLoading')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Counter value={demo?.total ?? stats.thisMonth ?? stats.total} label={t(demo ? 'home.demoComplaints' : 'home.statComplaints')} />
            <Counter value={demo?.verifiedRate ?? stats.verifiedRate} label={t('home.statVerified')} suffix="%" />
            <Counter value={demo?.verified ?? stats.verified} label="Citizen-verified fixes" />
            <Counter value={stats.departments} label={t('home.statDepartments')} />
          </div>
        )}
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="hair-t">
        <div className="frame py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionLabel index={2}>{t('home.how')}</SectionLabel>
              <h2 className="font-display text-3xl leading-tight tracking-tight md:text-4xl">{t('home.howSub')}</h2>
              <Reveal delay={120} className="mt-6">
                <p className="max-w-sm text-[14px] leading-relaxed text-ink-soft">
                  The AI always suggests — a human can override, and the citizen always has the final say.
                  Every override is logged, which is how routing accuracy improves over time.
                </p>
              </Reveal>
            </div>
            <div className="lg:col-span-8">
              <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
                {[
                  { n: '01', title: t('home.step1'), body: t('home.step1d'), Icon: IconMic },
                  { n: '02', title: t('home.step2'), body: t('home.step2d'), Icon: IconSpark },
                  { n: '03', title: t('home.step3'), body: t('home.step3d'), Icon: IconTrack },
                  { n: '04', title: t('home.step4'), body: t('home.step4d'), Icon: IconShield },
                ].map((step, i) => (
                  <Reveal key={step.n} delay={i * 90} className="bg-card p-6">
                    <div className="flex items-center justify-between">
                      <span className="label">/{step.n}</span>
                      <step.Icon size={20} className="text-ink-faint" />
                    </div>
                    <h3 className="mt-6 font-display text-2xl tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- DEPARTMENTS ---------------- */}
      <section className="hair-t">
        <div className="frame py-16">
          <SectionLabel index={3} right={<Link to="/departments" className="link-sweep label text-ink">{t('common.view')} all</Link>}>
            {t('home.deptTitle')}
          </SectionLabel>
          <p className="mb-8 max-w-xl text-[14px] leading-relaxed text-ink-soft">{t('home.deptSub')}</p>
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {departments.slice(0, 9).map((d) => (
              <Link
                key={d.id}
                to="/departments"
                className="group flex items-center justify-between gap-4 bg-card p-5 transition-colors hover:bg-paper-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-lg tracking-tight">{d.name}</div>
                  <div className="mt-1 text-[12.5px] text-ink-soft">{DEPT_BLURBS[d.code] || 'Civic services'}</div>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="mono text-[11px] text-ink-faint">{d.slaHours}h</span>
                  <IconArrow size={16} className="text-ink-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="hair-t">
        <div className="frame py-20 text-center">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-tight">
              {t('home.ctaTitle')}
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{t('home.ctaSub')}</p>
          </Reveal>
          <Reveal delay={200} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/lodge" variant="saffron" size="lg">
              {t('home.ctaLodge')}
            </Button>
            <Button to="/map" variant="ghost" size="lg">
              {t('home.mapCta')}
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
