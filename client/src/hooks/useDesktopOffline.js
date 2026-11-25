/**
 * useDesktopOffline — Milestone 19
 *
 * React hook that tracks network connectivity for the desktop app.
 *
 * In Electron:
 *   • Calls window.desktop.getConnectivity() once on mount to get the
 *     current state from the main-process offline monitor.
 *   • Subscribes to window.desktop.onConnectivityChanged() for real-time push
 *     events whenever the main process detects a network transition.
 *
 * In the browser (non-Electron):
 *   • Falls back to navigator.onLine + the browser's online/offline events.
 *   • Identical hook API so components are portable.
 *
 * Returns:
 *   { online: boolean, since: string | null }
 *
 * Usage:
 *   const { online } = useDesktopOffline()
 *   if (!online) return <OfflineBanner />
 */

import { useEffect, useState } from 'react'

export function useDesktopOffline() {
  const [state, setState] = useState(() => {
    // Synchronous initial value: in Electron the monitor runs in main so we
    // can't get the value synchronously — optimistically assume online.
    // In the browser we can read navigator.onLine directly.
    return {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      since: null,
    }
  })

  useEffect(() => {
    // ── Electron path ──────────────────────────────────────────────────────
    if (window.desktop?.getConnectivity) {
      // Hydrate from main-process cache immediately
      window.desktop.getConnectivity().then((connectivity) => {
        setState({ online: connectivity.online, since: connectivity.since })
      }).catch(() => { /* ignore — stay optimistic */ })

      // Subscribe to push events for future transitions
      const unsubscribe = window.desktop.onConnectivityChanged((connectivity) => {
        setState({ online: connectivity.online, since: connectivity.since })
      })

      return unsubscribe
    }

    // ── Browser fallback ───────────────────────────────────────────────────
    const handleOnline  = () => setState({ online: true,  since: new Date().toISOString() })
    const handleOffline = () => setState({ online: false, since: new Date().toISOString() })

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return state
}
