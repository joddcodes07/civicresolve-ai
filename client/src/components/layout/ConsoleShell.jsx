import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from './Logo.jsx'
import {
  IconChart, IconList, IconAlert, IconShield, IconMap, IconGear, IconSpark,
  IconHome, IconClock, IconUser,
} from '../ui/Icons.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useI18n } from '../../lib/i18n.jsx'
import { initials } from '../../lib/format.js'

const OFFICER_NAV = [
  { to: '/officer', key: 'officer.title', label: 'Priority queue', Icon: IconList, end: true },
  { to: '/officer/reopened', label: 'Reopened', Icon: IconClock },
  { to: '/officer/map', label: 'Department map', Icon: IconMap },
]

const ADMIN_NAV = [
  { to: '/admin', key: 'admin.tab.overview', label: 'Overview', Icon: IconChart, end: true },
  { to: '/admin/complaints', key: 'admin.tab.complaints', label: 'Complaints', Icon: IconList },
  { to: '/admin/escalations', key: 'admin.tab.escalations', label: 'Escalations', Icon: IconAlert },
  { to: '/admin/review', key: 'admin.tab.review', label: 'Needs review', Icon: IconSpark },
  { to: '/admin/departments', key: 'admin.tab.departments', label: 'Departments', Icon: IconShield },
  { to: '/admin/ai', key: 'admin.tab.ai', label: 'AI accuracy', Icon: IconSpark },
  { to: '/admin/heatmap', key: 'admin.tab.heatmap', label: 'Heatmap', Icon: IconMap },
  { to: '/admin/settings', key: 'admin.tab.settings', label: 'Settings', Icon: IconGear },
]

export function ConsoleShell({ variant = 'officer' }) {
  const { user, logout } = useAuth()
  const { t, lang, setLang, languages } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const nav = variant === 'admin' ? ADMIN_NAV : OFFICER_NAV

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark size={28} />
        <div className="leading-none">
          <div className="font-display text-[15px] font-semibold">CivicResolve</div>
          <div className="label mt-0.5">{variant === 'admin' ? 'Admin console' : 'Officer console'}</div>
        </div>
      </div>
      <div className="hair-t" />
      <nav className="flex flex-col gap-0.5 p-3">
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
              }`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-3">
        <div className="hair-t mb-3" />
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-medium text-paper">
            {initials(user?.name || '')}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12.5px] font-medium">{user?.name}</div>
            <div className="label truncate">{user?.department || user?.role}</div>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <Link to="/" className="label rounded-lg px-2 py-2 text-ink-soft hover:text-ink">
            ← Citizen site
          </Link>
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="label rounded-lg px-2 py-2 text-left text-ink-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-paper md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line bg-card md:flex md:sticky md:top-0 md:h-dvh">
        {SidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-line" aria-label="Menu">
            <span className="flex flex-col gap-1">
              <span className="block h-px w-4 bg-ink" />
              <span className="block h-px w-4 bg-ink" />
              <span className="block h-px w-4 bg-ink" />
            </span>
          </button>
          <span className="font-display text-[15px] font-semibold">
            {variant === 'admin' ? 'Admin' : 'Officer'}
          </span>
          <Link to="/" className="label rounded-full border border-line px-3 py-1.5">
            Site
          </Link>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[260px] flex-col bg-card">
              {SidebarContent}
            </aside>
          </div>
        )}

        <div className="hidden justify-end gap-2 border-b border-line px-6 py-2.5 md:flex">
          <div className="flex items-center gap-0.5 rounded-full border border-line p-0.5">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`label rounded-full px-2.5 py-1 ${lang === l.code ? 'bg-ink text-paper' : 'text-ink-soft'}`}
              >
                {l.short}
              </button>
            ))}
          </div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ConsoleShell
