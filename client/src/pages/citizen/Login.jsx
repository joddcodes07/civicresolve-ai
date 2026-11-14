import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { api } from '../../lib/api.js'
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
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState([])
  const [stats, setStats] = useState(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const googleHandled = useRef(false)
  const from = location.state?.from || null
  const isLogin = mode === 'login'

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
    setFormError('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const email = form.email.trim()
    const phone = form.phone.trim()
    if (!isLogin && !email && !phone) {
      setFormError(t('login.contactRequired'))
      return
    }
    setBusy(true)
    try {
      if (isLogin) {
        const u = await login({ identifier: form.identifier, password: form.password })
        toast(`Welcome back, ${u.name.split(' ')[0]}`, { tone: 'green' })
        navigate(from || (u.role === 'ADMIN' ? '/admin' : u.role === 'OFFICER' ? '/officer' : '/'), { replace: true })
      } else {
        const payload = { name: form.name, password: form.password }
        if (email) payload.email = email
        if (phone) payload.phone = phone
        const u = await register(payload)
        toast(`Account created — welcome, ${u.name.split(' ')[0]}`, { tone: 'green' })
        navigate(from || '/', { replace: true })
      }
    } catch (err) {
      setFormError(err.message || t('login.failed'))
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
      <main className="flex flex-col items-center justify-center px-4 py-8 sm:px-10 sm:py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex w-fit items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-semibold tracking-tight">CivicResolve</span>
          </Link>

          <section aria-labelledby="login-title" className="rounded-[1.25rem] border border-line bg-card p-5 shadow-sm sm:p-8">
            <h1 id="login-title" className="font-display text-4xl tracking-tight">
              {t(isLogin ? 'login.title' : 'login.registerTitle')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {t(isLogin ? 'login.sub' : 'login.contactRequired')}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isLogin ? (
                <Field label={t('login.identifier')} required>
                  <Input value={form.identifier} onChange={(e) => update('identifier', e.target.value)} placeholder="you@example.com" autoComplete="username" required />
                </Field>
              ) : (
                <>
                  <Field label={t('login.name')} required>
                    <Input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" minLength={2} maxLength={80} required />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('login.email')}>
                      <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
                    </Field>
                    <Field label={t('login.phone')}>
                      <Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" inputMode="numeric" pattern="[0-9]{10,15}" />
                    </Field>
                  </div>
                </>
              )}

              <div className="relative">
                <Field label={t('login.password')} htmlFor="login-password" required>
                  <Input id="login-password" className="pr-20" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={isLogin ? undefined : 8} maxLength={isLogin ? undefined : 100} required />
                </Field>
                <button
                  type="button"
                  aria-controls="login-password"
                  aria-label={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute bottom-0 right-1 flex h-11 items-center rounded-lg px-3 text-xs font-medium text-ink-soft hover:text-ink"
                >
                  {t(showPassword ? 'login.hide' : 'login.show')}
                </button>
              </div>
              {formError && <p role="alert" className="text-sm text-red">{formError}</p>}

              <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:opacity-50">
                {busy ? <Spinner /> : t(isLogin ? 'login.submit' : 'login.register')}
              </button>
            </form>

            {googleEnabled && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
                  <span className="h-px flex-1 bg-line" />
                  <span>{t('login.or')}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <button
                  type="button"
                  aria-label={t('login.google')}
                  title={t('login.google')}
                  disabled={busy}
                  onClick={() => window.location.assign('/api/auth/google/start')}
                  className="mx-auto grid size-12 place-items-center rounded-full border border-line-strong bg-white transition-colors hover:border-ink hover:bg-paper disabled:opacity-50"
                >
                  <img src="/google-g.png" alt="" width="20" height="20" />
                </button>
              </>
            )}
            {googleError && <p role="alert" className="mt-3 text-sm text-red">{googleError}</p>}
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ink-soft">{t(isLogin ? 'login.newHere' : 'login.haveAccount')}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode(isLogin ? 'register' : 'login')
                setShowPassword(false)
                setFormError('')
                setGoogleError('')
                setForm((current) => ({ ...current, password: '' }))
              }}
              className="rounded-sm font-semibold text-blue hover:underline disabled:opacity-50"
            >
              {t(isLogin ? 'login.register' : 'login.submit')}
            </button>
          </div>

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
      </main>

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
