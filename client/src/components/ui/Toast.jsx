import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { TONE_DOT } from '../../lib/format.js'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, { tone = 'ink', duration = 4200 } = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  const value = useMemo(() => ({ toast: push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[200] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto card card-shadow animate-fade-up flex items-start gap-3 bg-card px-4 py-3 text-left"
          >
            <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${TONE_DOT[t.tone] || 'bg-ink-soft'}`} />
            <span className="text-[13px] leading-snug">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
