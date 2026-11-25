import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import { App } from './App.jsx'
import { I18nProvider } from './lib/i18n.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { LiteProvider } from './lib/lite.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

// Environment-aware router selection:
// In Electron desktop (packaged file:// or build-time flag VITE_ROUTER_MODE=hash or VITE_DESKTOP=true),
// use HashRouter to prevent file:// path navigation issues.
// For standard web deployments (Vercel, browsers), use BrowserRouter for clean URLs.
const isDesktop =
  import.meta.env.VITE_ROUTER_MODE === 'hash' ||
  import.meta.env.VITE_DESKTOP === 'true' ||
  (typeof window !== 'undefined' && (window.location.protocol === 'file:' || Boolean(window.desktop?.isElectron)))

const Router = isDesktop ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <I18nProvider>
        <LiteProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </LiteProvider>
      </I18nProvider>
    </Router>
  </StrictMode>,
)
