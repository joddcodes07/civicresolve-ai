import { Link } from 'react-router-dom'

/** Pin-Check mark: a map pin (every complaint has a place) with a verified check. */
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-ink)" />
      <path
        d="M16 6.4c-4 0-7.2 3.2-7.2 7.2 0 5.2 7.2 12.4 7.2 12.4s7.2-7.2 7.2-12.4c0-4-3.2-7.2-7.2-7.2Z"
        fill="var(--color-paper)"
      />
      <path d="M12.8 13.4l2.3 2.3 4.2-4.4" stroke="var(--color-blue)" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="CivicResolve home">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight">CivicResolve</span>
          <span className="label mt-0.5 text-[8.5px]">Route · Track · Prove</span>
        </span>
      )}
    </Link>
  )
}

export default Logo
