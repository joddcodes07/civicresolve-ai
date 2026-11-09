export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={`no-scrollbar flex gap-1 overflow-x-auto ${className}`} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`label shrink-0 rounded-full border px-3.5 py-2 transition-colors ${
              active ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-soft hover:border-line'
            }`}
          >
            {tab.label}
            {tab.count != null ? <span className="ml-1.5 tabular opacity-60">{tab.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
