import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { issueColor } from '../../lib/mapPins.js'
import { useI18n } from '../../lib/i18n.jsx'
import { IconCheck, IconMap } from '../ui/Icons.jsx'
import { Pill, BandPill, PriorityScore } from '../ui/Pills.jsx'
import { formatDateTime } from '../../lib/format.js'

// Fit the sample to the schematic and space out the preview markers.
function previewPins(issues) {
  const points = [...new Map(issues.filter(({ lat, lng }) =>
    Number.isFinite(lat) && Number.isFinite(lng),
  ).map((issue) => [issue.id, issue])).values()]
  if (!points.length) return []
  const latitudes = points.map(({ lat }) => lat)
  const longitudes = points.map(({ lng }) => lng)
  const south = Math.min(...latitudes)
  const west = Math.min(...longitudes)
  const height = Math.max(...latitudes) - south || 1
  const width = Math.max(...longitudes) - west || 1
  const candidates = points.map((issue) => ({
    ...issue,
    x: 15 + 69 * ((issue.lng - west) / width),
    y: 16 + 55 * (1 - (issue.lat - south) / height),
  }))
  const pins = []
  for (const pin of candidates) {
    if (pins.every((other) => Math.hypot((pin.x - other.x) / 14, (pin.y - other.y) / 19) >= 1)) {
      pins.push(pin)
      if (pins.length === 9) break
    }
  }
  return pins
}

export function LivingMap({ issues = [] }) {
  const { t } = useI18n()
  const [active, setActive] = useState(null)
  const pins = useMemo(() => previewPins(issues), [issues])

  const [motionPaused, setMotionPaused] = useState(false)
  const [motionAllowed, setMotionAllowed] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setMotionAllowed(!preference.matches)
    updatePreference()
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  const selected = active ? pins.find((p) => p.id === active) : null

  return (
    <div className="relative isolate">
      <div className="home-map-stage relative isolate aspect-[6/5] md:aspect-[7/5]">
        <div className="home-map-plane absolute inset-x-[4%] inset-y-[2%] md:inset-x-[3%] xl:inset-x-0">
          <div className="home-map-surface pointer-events-none absolute inset-0">
            <img src="/civic-map-plane.svg" alt="" draggable="false" className="absolute inset-0 size-full object-fill" />
            {motionAllowed && !motionPaused && (
              <video
                className="absolute inset-0 size-full object-fill"
                src="/civic-map-motion.webm"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden="true"
              />
            )}
          </div>
          {pins.map((pin, index) => {
            const isActive = pin.id === active
            const color = issueColor(pin)
            const resolved = pin.status === 'RESOLVED' || pin.status === 'CONFIRMED'
            return (
              <button
                key={pin.id}
                type="button"
                onClick={() => setActive(isActive ? null : pin.id)}
                className={`home-map-pin absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${isActive ? 'z-20' : 'z-10'}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, '--pin-color': color === '#f28c28' ? '#a54d0a' : color }}
                aria-label={`${pin.category?.name} · ${pin.ward?.name}`}
                aria-pressed={isActive}
              >
                <span aria-hidden="true" className="home-map-pin-anchor" />
                <span aria-hidden="true" className="home-map-pin-head">
                  <span className="home-map-pin-symbol animate-pin-drop" style={{ animationDelay: `${index * 35}ms` }}>
                    <IconMap size={30} className={resolved ? 'home-map-pin-resolved' : undefined} />
                    {resolved && <IconCheck size={10} className="home-map-pin-check" />}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="absolute inset-x-3 bottom-14 z-30 rounded-xl border border-line bg-card p-3 shadow-lg sm:left-auto sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mono text-[11px] tracking-wider text-ink-faint">{selected.code}</div>
              <div className="mt-0.5 truncate font-display text-lg">{selected.category?.name}</div>
              <div className="mt-0.5 text-[12px] text-ink-soft">
                {selected.department?.name} · {selected.ward?.name}
              </div>
            </div>
            <PriorityScore score={selected.priority} band={selected.priorityBand} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BandPill band={selected.priorityBand} />
            <Pill tone="ink">{selected.reportCount} report{selected.reportCount > 1 ? 's' : ''}</Pill>
            <Pill tone={selected.status === 'RESOLVED' ? 'green' : 'blue'}>{selected.status}</Pill>
          </div>
          <div className="hair-t mt-3 flex items-center justify-between pt-3">
            <span className="label">{selected.demo ? t('common.demo') : `Reported ${formatDateTime(selected.createdAt)}`}</span>
            <button type="button" onClick={() => setActive(null)} className="label text-ink-soft hover:text-ink">
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-2 pt-3">
        <Pill tone="blue">{t('common.demo')}</Pill>
        {pins.length > 0 && <span className="text-xs text-ink-soft">{t('map.previewHint')}</span>}
        {motionAllowed && (
          <button type="button" onClick={() => setMotionPaused((paused) => !paused)} className="rounded-sm px-2 py-1 text-xs text-ink-soft hover:text-ink">
            {t(motionPaused ? 'map.playMotion' : 'map.pauseMotion')}
          </button>
        )}
        <Link to="/map" className="ml-auto rounded-sm text-sm font-semibold text-blue hover:underline">
          {t('map.openFull')} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  )
}

export default LivingMap
