import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LiteContext = createContext(null)
const KEY = 'civicresolve.lite'

/**
 * "Lite mode" for slow connections / low-data phones: no motion, no video,
 * plain cards. Persisted, and auto-suggested when the network is very slow.
 */
export function LiteProvider({ children }) {
  const [lite, setLite] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.body.classList.toggle('lite', lite)
    try {
      localStorage.setItem(KEY, lite ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [lite])

  const value = useMemo(() => ({ lite, setLite, toggle: () => setLite((v) => !v) }), [lite])
  return <LiteContext.Provider value={value}>{children}</LiteContext.Provider>
}

export function useLite() {
  const ctx = useContext(LiteContext)
  if (!ctx) throw new Error('useLite must be used inside <LiteProvider>')
  return ctx
}
