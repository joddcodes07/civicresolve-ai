/**
 * OfflineBanner — Milestone 19
 *
 * A slim, non-intrusive banner that appears at the top of the app when the
 * desktop application loses network connectivity and disappears when it
 * reconnects.
 *
 * Behaviour:
 *   • In Electron: driven by the main-process offline monitor via useDesktopOffline.
 *   • In the browser: driven by navigator.onLine / window online+offline events
 *     via the same hook — renders nothing when online.
 *   • Renders nothing at all when the network is online.
 *   • Accessible: role="alert" + aria-live="polite" so screen readers announce it.
 *   • No dependencies beyond React + the useDesktopOffline hook.
 *
 * Usage (mount once near the root, e.g. in App.jsx):
 *   import { OfflineBanner } from './components/layout/OfflineBanner.jsx'
 *   ...
 *   <OfflineBanner />
 *   <Suspense ...>...</Suspense>
 */

import { useDesktopOffline } from '../../hooks/useDesktopOffline.js'

export function OfflineBanner() {
  const { online } = useDesktopOffline()

  if (online) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: '#1e293b',
        color: '#f1f5f9',
        fontSize: '0.8125rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
        // Thin accent stripe along the bottom of the banner
        borderBottom: '2px solid #ef4444',
        userSelect: 'none',
        // Keep the banner above Electron's native traffic-light buttons on macOS
        WebkitAppRegion: 'no-drag',
      }}
    >
      {/* Wi-fi off icon (inline SVG, no external deps) */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="#ef4444" />
      </svg>
      No internet connection — some features are unavailable
    </div>
  )
}
