import { Link } from 'react-router-dom'
import { LogoMark } from './Logo.jsx'
import { SectionLabel } from '../ui/Primitives.jsx'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="frame py-14">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <LogoMark size={34} />
              <span className="font-display text-xl font-semibold tracking-tight">CivicResolve-AI</span>
            </div>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
              An AI-based single window to lodge and track citizen grievances across every municipal
              department. Built as a response to Problem Statement #343.
            </p>
            <p className="mt-6 font-display text-2xl tracking-tight">
              Route it. <span className="text-blue">Track it.</span> Prove it.
            </p>
          </div>

          <div className="md:col-span-3">
            <SectionLabel>Citizens</SectionLabel>
            <ul className="space-y-2.5">
              {[
                ['/lodge', 'Lodge a complaint'],
                ['/track', 'Track by ID'],
                ['/chat', 'Chat with Shikayat Saathi'],
                ['/map', 'Public issue map'],
                ['/departments', 'Departments'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="link-sweep text-[13.5px] text-ink-soft">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <SectionLabel>Consoles</SectionLabel>
            <ul className="space-y-2.5">
              {[
                ['/officer', 'Officer console'],
                ['/admin', 'Admin dashboard'],
                ['/help', 'Help'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="link-sweep text-[13.5px] text-ink-soft">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <SectionLabel>Built with</SectionLabel>
            <p className="label leading-relaxed">
              React · Node
              <br />
              PostgreSQL · Prisma
              <br />
              Express · Socket.IO
            </p>
          </div>
        </div>

        <div className="hair-t mt-12 flex flex-col justify-between gap-3 pt-5 md:flex-row">
          <span className="label">© {new Date().getFullYear()} CivicResolve-AI · Demo project</span>
          <span className="label">PS #343 · Smart Automation · Software</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
