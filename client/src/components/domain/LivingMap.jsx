import { useMemo, useState } from 'react'
import { issueColor } from '../../lib/mapPins.js'
import { useI18n } from '../../lib/i18n.jsx'
import { Pill, BandPill, PriorityScore } from '../ui/Pills.jsx'
import { formatDateTime } from '../../lib/format.js'

// Projection window roughly covering the demo wards around Pune.
const BOUNDS = { minLat: 18.43, maxLat: 18.66, minLng: 73.72, maxLng: 74.02 }

function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(4, Math.min(96, y)) }
}

/**
 * The hero: a tilted "living" city map. Pins drop in for live issues, the
 * highlighted one opens a glass data card. A pure-CSS/SVG scene (no map tiles)
 * so it is fast, animated, and unmistakably ours.
 */
export function LivingMap({ issues = [] }) {
  const { t } = useI18n()
  const [active, setActive] = useState(null)

  const pins = useMemo(() => {
    const seen = new Set()
    return issues
      .filter((i) => {
        if (seen.has(i.id)) return false
        seen.add(i.id)
        return true
      })
      .slice(0, 26)
      .map((issue, index) => ({ ...issue, ...project(issue.lat, issue.lng), index }))
  }, [issues])

  const selected = active ? pins.find((p) => p.id === active) : null

  return (
    <div className="relative">
      <div style={{ perspective: '1400px' }} className="w-full">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-[#e9e7df] md:aspect-[16/11]"
          style={{ transform: 'rotateX(22deg) rotateZ(-1.5deg)', transformStyle: 'preserve-3d' }}
        >
          {/* ward grid */}
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(19,20,25,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(19,20,25,0.09) 1px, transparent 1px)',
              backgroundSize: '8% 10%',
            }}
          />
          {/* parks */}
          <div className="absolute left-[8%] top-[12%] h-[20%] w-[16%] rounded-[40%] bg-green/12" />
          <div className="absolute right-[14%] top-[58%] h-[24%] w-[20%] rounded-[45%] bg-green/12" />
          {/* river */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-2 44 C 18 38, 30 52, 48 46 S 78 30, 104 40" fill="none" stroke="#7fb4e8" strokeWidth="3.4" strokeLinecap="round" opacity="0.75" />
            <path d="M-2 44 C 18 38, 30 52, 48 46 S 78 30, 104 40" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />
          </svg>
          {/* main roads */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 20 H100 M0 62 H100 M22 0 V75 M68 0 V75" fill="none" stroke="rgba(19,20,25,0.13)" strokeWidth="0.8" />
          </svg>

          {/* pins */}
          {pins.map((pin) => {
            const color = issueColor(pin)
            const isActive = pin.id === active
            return (
              <button
                key={pin.id}
                onClick={() => setActive(isActive ? null : pin.id)}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: isActive ? 30 : pin.demo ? 10 : 15, animation: `pin-drop 0.7s cubic-bezier(.16,1,.3,1) ${Math.min(pin.index * 70, 1400)}ms both` }}
                aria-label={`${pin.category?.name} in ${pin.ward?.name}${pin.demo ? ` · ${t('common.demo')}` : ''}`}
              >
                <span className="relative block">
                  {pin.priorityBand === 'urgent' && (
                    <span className="animate-pulse-ring absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: color, opacity: 0.35 }} />
                  )}
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium text-white shadow-md transition-transform ${pin.demo ? 'border-2 border-dashed border-card' : 'ring-2 ring-card'} ${isActive ? 'scale-110' : ''}`}
                    style={{ background: color, transform: 'translateZ(20px)' }}
                  >
                    {pin.reportCount > 1 ? pin.reportCount : ''}
                  </span>
                  <span className="absolute left-1/2 top-full h-2 w-px -translate-x-1/2" style={{ background: color }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* floating glass data card (not tilted) */}
      {selected && (
        <div className="glass card-shadow absolute bottom-4 left-4 right-4 z-40 animate-fade-up rounded-[14px] p-4 md:left-auto md:right-6 md:w-[330px]">
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
            <button onClick={() => setActive(null)} className="label text-ink-soft hover:text-ink">
              Close
            </button>
          </div>
        </div>
      )}

      {!selected && pins.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20">
          <span className="pill border-line bg-paper/80 text-ink-soft backdrop-blur">{pins.some((pin) => pin.demo) ? t('map.demoMarkers') : 'Tap a pin to see the issue'}</span>
        </div>
      )}
    </div>
  )
}

export default LivingMap
