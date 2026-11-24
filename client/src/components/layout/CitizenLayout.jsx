import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { PageLoader } from './PageLoader.jsx'
import { TopBar } from './TopBar.jsx'
import { Footer } from './Footer.jsx'
import { IconHome, IconPlus, IconTrack, IconMap, IconUser } from '../ui/Icons.jsx'
import { useI18n } from '../../lib/i18n.jsx'
import { useAuth } from '../../lib/auth.jsx'

const TABS = [
  { to: '/', key: 'nav.home', Icon: IconHome, end: true },
  { to: '/lodge', key: 'nav.lodge', Icon: IconPlus },
  { to: '/track', key: 'nav.track', Icon: IconTrack },
  { to: '/map', key: 'nav.map', Icon: IconMap },
]

export function CitizenLayout() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="grain flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex-1 pb-24 lg:pb-0">
        <Suspense fallback={<PageLoader />}>
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/90 backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ to, key, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-faint'
                }`
              }
            >
              <Icon size={19} />
              <span className="label text-[9px]">{t(key)}</span>
            </NavLink>
          ))}
          <NavLink
            to={user ? '/my' : '/login'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${isActive ? 'text-ink' : 'text-ink-faint'}`
            }
          >
            <IconUser size={19} />
            <span className="label text-[9px]">{user ? t('nav.my') : t('nav.login')}</span>
          </NavLink>
        </div>
      </nav>

      {/* Floating mobile lodge button on non-lodge pages */}
      {pathname !== '/lodge' && (
        <Link
          to="/lodge"
          className="btn btn-saffron fixed bottom-20 right-4 z-40 !min-h-0 !px-4 !py-3 shadow-lg lg:hidden"
          aria-label={t('nav.lodge')}
        >
          <IconPlus size={18} />
        </Link>
      )}
    </div>
  )
}

export default CitizenLayout
