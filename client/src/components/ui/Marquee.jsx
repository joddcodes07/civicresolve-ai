/** Infinite horizontal marquee. Content is duplicated so the loop is seamless. */
export function Marquee({ items = [], className = '', separator = '·' }) {
  const doubled = [...items, ...items]
  return (
    <div className={`marquee ${className}`}>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="label flex shrink-0 items-center whitespace-nowrap text-ink-soft">
            <span className="px-6">{item}</span>
            <span className="text-ink-ghost">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default Marquee
