import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from './Logo.jsx'
import { Button } from '../ui/Button.jsx'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { initials } from '../../lib/format.js'

const CITIZEN_LINKS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/lodge', key: 'nav.lodge' },
  { to: '/track', key: 'nav.track' },
  { to: '/map', key: 'nav.map' },
  { to: '/departments', key: 'nav.departments' },
]

export function TopBar() {
  const { t, lang, setLang, languages } = useI18n()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname])

  const consoleLink = user?.role === 'ADMIN' ? '/admin' : user?.role === 'OFFICER' ? '/officer' : null

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-lg">
        <div className="frame flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {CITIZEN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `label rounded-full px-3 py-2 transition-colors ${
                    isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                {t(link.key)}
              </NavLink>
            ))}
            {consoleLink && (
              <NavLink to={consoleLink} className="label ml-1 rounded-full border border-line px-3 py-2 text-ink">
                {user?.role === 'ADMIN' ? t('nav.admin') : t('nav.officer')}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-0.5 rounded-full border border-line p-0.5 sm:flex">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`label rounded-full px-2.5 py-1.5 transition-colors ${
                    lang === l.code ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
                  }`}
                  aria-pressed={lang === l.code}
                >
                  {l.short}
                </button>
              ))}
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-line-strong"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[11px] font-medium text-paper">
                    {initials(user.name)}
                  </span>
                  <span className="hidden text-[12.5px] sm:inline">{user.name.split(' ')[0]}</span>
                </button>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                    <div className="card card-shadow absolute right-0 z-50 mt-2 w-56 overflow-hidden p-1">
                      <div className="hair-b px-3 py-3">
                        <div className="text-[13px] font-medium">{user.name}</div>
                        <div className="label mt-0.5">{user.role}{user.department ? ` · ${user.department}` : ''}</div>
                      </div>
                      <Link to="/my" className="label block rounded-lg px-3 py-2.5 text-ink-soft hover:bg-paper-2 hover:text-ink">
                        {t('nav.my')}
                      </Link>
                      {consoleLink && (
                        <Link to={consoleLink} className="label block rounded-lg px-3 py-2.5 text-ink-soft hover:bg-paper-2 hover:text-ink">
                          {user.role === 'ADMIN' ? t('nav.admin') : t('nav.officer')}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout()
                          navigate('/')
                        }}
                        className="label block w-full rounded-lg px-3 py-2.5 text-left text-ink-soft hover:bg-paper-2 hover:text-ink"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Button to="/login" size="sm" variant="solid" className="hidden sm:inline-flex">
                {t('nav.login')}
              </Button>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line lg:hidden"
              aria-label={t('nav.menu')}
              aria-expanded={open}
            >
              <span className="flex flex-col gap-1">
                <span className={`block h-px w-4 bg-ink transition-transform ${open ? 'translate-y-[5px] rotate-45' : ''}`} />
                <span className={`block h-px w-4 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
                <span className={`block h-px w-4 bg-ink transition-transform ${open ? '-translate-y-[5px] -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-paper/95 backdrop-blur-xl" onClick={() => setOpen(false)} />
          <nav className="relative frame flex h-full flex-col justify-center gap-1 pt-16">
            {CITIZEN_LINKS.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="animate-fade-up font-display text-4xl font-semibold tracking-tight"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {t(link.key)}
              </NavLink>
            ))}
            {consoleLink && (
              <Link to={consoleLink} className="animate-fade-up font-display text-4xl font-semibold tracking-tight text-blue" style={{ animationDelay: '200ms' }}>
                {user?.role === 'ADMIN' ? t('nav.admin') : t('nav.officer')}
              </Link>
            )}
            <div className="mt-8 flex items-center gap-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`label rounded-full border px-3 py-2 ${lang === l.code ? 'border-ink bg-ink text-paper' : 'border-line'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {!user && (
              <Button to="/login" variant="saffron" className="mt-4 w-fit">
                {t('nav.login')}
              </Button>
            )}
          </nav>
        </div>
      )}
    </>
  )
}

export default TopBar
