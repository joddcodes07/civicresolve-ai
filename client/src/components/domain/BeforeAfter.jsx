import { useCallback, useRef, useState } from 'react'

/** Drag-to-compare before/after photo wipe. */
export function BeforeAfter({ before, after, beforeLabel = 'Before', afterLabel = 'After', height = 300 }) {
  const [pos, setPos] = useState(50)
  const ref = useRef(null)
  const dragging = useRef(false)

  const move = useCallback((clientX) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, next)))
  }, [])

  return (
    <div
      ref={ref}
      className="relative select-none overflow-hidden rounded-xl border border-line"
      style={{ height }}
      onMouseDown={(e) => {
        dragging.current = true
        move(e.clientX)
      }}
      onMouseMove={(e) => dragging.current && move(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => move(e.touches[0].clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
    >
      {after ? (
        <img src={after} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-paper-2 text-center">
          <span className="label">After-photo pending</span>
        </div>
      )}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {before ? (
          <img src={before} alt={beforeLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-line">
            <span className="label">No before-photo</span>
          </div>
        )}
      </div>

      <span className="pill absolute left-3 top-3 border-white/30 bg-ink/70 text-paper backdrop-blur">{beforeLabel}</span>
      <span className="pill absolute right-3 top-3 border-white/30 bg-ink/70 text-paper backdrop-blur">{afterLabel}</span>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-card/90" />
        <div className="absolute top-1/2 -ml-5 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-card shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M9 6 5 12l4 6M15 6l4 6-4 6" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default BeforeAfter
