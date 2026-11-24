import { useEffect, useState } from 'react'

const IS_DESKTOP = typeof window !== 'undefined' && !!window?.desktop?.accessibility

/**
 * DesktopAccessibilityBar — Milestone 30
 *
 * Provides native desktop accessibility & display zoom controls:
 * - Zoom In (+), Zoom Out (-), Reset (100%)
 * - High-contrast indicator
 * - Fullscreen / Kiosk mode toggle
 *
 * Automatically renders in desktop mode.
 */
export function DesktopAccessibilityBar() {
  const [info, setInfo] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!IS_DESKTOP) return

    let unsubscribe = () => {}

    window.desktop.accessibility.getInfo().then((res) => {
      setInfo(res)
    })

    unsubscribe = window.desktop.accessibility.onStateChanged((updated) => {
      setInfo(updated)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (!IS_DESKTOP || !info) return null

  const zoomPercent = Math.round((info.zoomFactor || 1) * 100)

  const handleZoomIn = async () => {
    const factor = await window.desktop.accessibility.zoomIn()
    setInfo((prev) => ({ ...prev, zoomFactor: factor }))
  }

  const handleZoomOut = async () => {
    const factor = await window.desktop.accessibility.zoomOut()
    setInfo((prev) => ({ ...prev, zoomFactor: factor }))
  }

  const handleResetZoom = async () => {
    const factor = await window.desktop.accessibility.resetZoom()
    setInfo((prev) => ({ ...prev, zoomFactor: factor }))
  }

  const handleToggleFullscreen = async () => {
    const isFull = await window.desktop.accessibility.toggleFullScreen()
    setInfo((prev) => ({ ...prev, isFullScreen: isFull }))
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      {open ? (
        <div className="flex items-center gap-2 rounded-full border border-line bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span className="text-xs font-semibold text-ink-soft">Display:</span>
          
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-xs font-bold text-ink hover:bg-paper-2"
            title="Zoom out"
            aria-label="Zoom out"
          >
            -
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-1 text-xs font-mono font-medium text-ink hover:underline"
            title="Reset zoom to 100%"
          >
            {zoomPercent}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-xs font-bold text-ink hover:bg-paper-2"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>

          <div className="mx-1 h-3 w-px bg-line" />

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="rounded px-2 py-0.5 text-xs font-medium text-ink hover:bg-paper-2"
            title={info.isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {info.isFullScreen ? 'Exit Full' : 'Fullscreen'}
          </button>

          {info.highContrast && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
              High Contrast
            </span>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 text-xs text-ink-faint hover:text-ink"
            aria-label="Close accessibility controls"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card/90 text-sm font-semibold text-ink-soft shadow-md backdrop-blur-md hover:bg-card hover:text-ink"
          title="Accessibility & Zoom controls"
          aria-label="Open accessibility & zoom controls"
        >
          🔍
        </button>
      )}
    </div>
  )
}
