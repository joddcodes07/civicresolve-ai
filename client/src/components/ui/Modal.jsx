import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card card-shadow relative z-10 w-full ${width} max-h-[90vh] overflow-y-auto animate-fade-up`}
      >
        <div className="hair-b sticky top-0 z-10 flex items-start justify-between gap-4 bg-card/95 px-6 py-4 backdrop-blur">
          <div>
            <h3 className="font-display text-xl">{title}</h3>
            {subtitle && <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="label shrink-0 rounded-full border border-line px-3 py-1.5 hover:border-line-strong" aria-label="Close">
            ESC
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="hair-t sticky bottom-0 bg-card/95 px-6 py-4 backdrop-blur">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
