import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { api } from '../../lib/api.js'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Input } from '../../components/ui/Field.jsx'
import { LogoMark } from '../../components/layout/Logo.jsx'
import { Spinner } from '../../components/ui/Primitives.jsx'
import { Pill } from '../../components/ui/Pills.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const ROLE_TONE = { CITIZEN: 'blue', OFFICER: 'saffron', ADMIN: 'violet' }

export default function Login() {
  const { t } = useI18n()
  const { login, loginWithToken, register, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', identifier: '', email: '', phone: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState([])
  const [stats, setStats] = useState(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const googleHandled = useRef(false)
  const from = location.state?.from || null

  useEffect(() => {
    api.get('/api/auth/google/status').then(({ enabled }) => setGoogleEnabled(enabled)).catch(() => {})
    api.get('/api/meta/stats').then(d => setStats(d.stats)).catch(() => {})
    api.get('/api/auth/demo-accounts').then((d) => setDemo(d.accounts || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) navigate(from || (user.role === 'ADMIN' ? '/admin' : user.role === 'OFFICER' ? '/officer' : '/'), { replace: true })
  }, [user, navigate, from])

  useEffect(() => {
    const status = new URLSearchParams(location.search).get('google')
    if (!status || googleHandled.current) return
    googleHandled.current = true
    navigate('/login', { replace: true })
    if (status === 'cancelled') return
    if (status !== 'complete') {
      setGoogleError(status === 'existing'
        ? 'This email already has a CivicResolve account. Sign in with its existing method.'
        : 'Google sign-in could not finish. Try again.')
      return
    }
    setBusy(true)
    fetch('/api/auth/google/exchange', { method: 'POST' })
      .then(async response => {
        if (!response.ok) throw new Error('Google sign-in expired. Start again.')
        const session = await response.json()
        loginWithToken(session.token, session.user)
      })
      .catch(error => setGoogleError(error.message))
      .finally(() => setBusy(false))
  }, [location.search, loginWithToken, navigate])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        const u = await login({ identifier: form.identifier, password: form.password })
        toast(`Welcome back, ${u.name.split(' ')[0]}`, { tone: 'green' })
        navigate(from || (u.role === 'ADMIN' ? '/admin' : u.role === 'OFFICER' ? '/officer' : '/'), { replace: true })
      } else {
        const payload = { name: form.name, password: form.password }
        if (form.email) payload.email = form.email
        if (form.phone) payload.phone = form.phone
        const u = await register(payload)
        toast(`Account created — welcome, ${u.name.split(' ')[0]}`, { tone: 'green' })
        navigate(from || '/', { replace: true })
      }
    } catch (err) {
      toast(err.message || t('login.failed'), { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  async function quickLogin(account) {
    setBusy(true)
    try {
      const u = await login({ identifier: account.identifier, password: account.password })
      navigate(u.role === 'ADMIN' ? '/admin' : u.role === 'OFFICER' ? '/officer' : '/', { replace: true })
    } catch (err) {
      toast(err.message || t('login.failed'), { tone: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* left: form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link to="/" className="mb-10 flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-lg font-semibold tracking-tight">CivicResolve</span>
        </Link>

        <h1 className="font-display text-4xl tracking-tight">{mode === 'login' ? t('login.title') : t('login.registerTitle')}</h1>
        <p className="mt-3 max-w-sm text-[14px] text-ink-soft">{t('login.sub')}</p>

        <form onSubmit={handleSubmit} className="mt-8 max-w-sm space-y-5">
          {mode === 'register' && (
            <Field label={t('login.name')} required>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" required />
            </Field>
          )}

          {mode === 'login' ? (
            <Field label={t('login.identifier')} required>
              <Input value={form.identifier} onChange={(e) => update('identifier', e.target.value)} placeholder="you@example.com" autoComplete="username" required />
            </Field>
          ) : (
            <>
              <Field label={t('login.email')} hint={t('common.optional')}>
                <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
              </Field>
              <Field label={t('login.phone')} hint={t('common.optional')}>
                <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} inputMode="numeric" />
              </Field>
            </>
          )}

          <Field label={t('login.password')} required>
            <Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </Field>

          <Button type="submit" variant="solid" block disabled={busy}>
            {busy ? <Spinner /> : mode === 'login' ? t('login.submit') : t('login.register')}
          </Button>
        </form>

        {googleEnabled && (
          <div className="mt-4 max-w-sm">
            <Button type="button" block disabled={busy} onClick={() => window.location.assign('/api/auth/google/start')}>
              Continue with Google
            </Button>
          </div>
        )}
        {googleError && <p role="alert" className="mt-3 max-w-sm text-sm text-ink-soft">{googleError}</p>}

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="label mt-6 w-fit text-ink-soft hover:text-ink"
        >
          {mode === 'login' ? t('login.register') : t('login.haveAccount')}
        </button>

        {demo.length > 0 && (
          <div className="mt-10 max-w-sm">
            <div className="hair-t pt-5">
              <div className="flex items-center justify-between">
                <span className="label label-ink">{t('login.demo')}</span>
                <span className="label">{t('login.demoHint')}</span>
              </div>
              <div className="mt-3 space-y-2">
                {demo.map((account) => (
                  <button
                    key={account.identifier}
                    onClick={() => quickLogin(account)}
                    disabled={busy}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left transition-colors hover:border-line-strong"
                  >
                    <div>
                      <div className="text-[13px] font-medium">{account.name}</div>
                      <div className="mono text-[11px] text-ink-faint">{account.identifier}</div>
                    </div>
                    <Pill tone={ROLE_TONE[account.role]}>{account.role}</Pill>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* right: editorial panel */}
      <div className="relative hidden overflow-hidden border-l border-line bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="label text-paper/50">PS #343 · AI civic grievance portal</div>
        <div>
          <h2 className="font-display text-5xl leading-[0.98] tracking-tight">
            Route it right.
            <br />
            Track it live.
            <br />
            <span className="text-saffron">Prove it's fixed.</span>
          </h2>
          <p className="mt-6 max-w-md text-[14px] leading-relaxed text-paper/70">
            One ID for every department. The AI suggests the routing, officers act on it, and the citizen
            always has the final word before a complaint closes.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            [stats?.languages ?? '—', 'languages'],
            [stats?.departments ?? '—', 'departments'],
            [stats?.formulas ?? '—', 'formulas'],
          ].map(([n, label]) => (
            <div key={label}>
              <div className="mono text-3xl">{n}</div>
              <div className="label mt-1 text-paper/50">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
