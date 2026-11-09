import { useEffect, useRef } from 'react'

/**
 * Reveals content when it scrolls into view: rises, un-blurs, staggered by `delay`.
 * Falls back to instantly visible when the user prefers reduced motion.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, once = true, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reveal = () => el.classList.add('is-in')

    // Failsafe: content must never stay hidden if the observer is unavailable.
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      reveal()
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal()
          if (once) io.disconnect()
        } else if (!once) {
          el.classList.remove('is-in')
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    // Second failsafe: if nothing has revealed this element shortly after mount,
    // show it anyway so a slow observer can never leave a blank page.
    const safety = setTimeout(reveal, 3000)
    return () => {
      clearTimeout(safety)
      io.disconnect()
    }
  }, [once])

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

export default Reveal
