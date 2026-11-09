export function Field({ label, hint, error, required, children, htmlFor, className = '' }) {
  return (
    <label className={`block ${className}`} htmlFor={htmlFor}>
      {label && (
        <span className="mb-2 flex items-center justify-between gap-3">
          <span className="label label-ink">
            {label}
            {required && <span className="text-red"> *</span>}
          </span>
          {hint && <span className="label normal-case tracking-normal text-ink-ghost">{hint}</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1.5 block text-[12.5px] text-red">{error}</span>}
    </label>
  )
}

export function Input({ className = '', error, ...rest }) {
  return <input className={`field ${error ? 'field-error' : ''} ${className}`} {...rest} />
}

export function Textarea({ className = '', error, rows = 5, ...rest }) {
  return <textarea className={`field resize-none leading-relaxed ${error ? 'field-error' : ''} ${className}`} rows={rows} {...rest} />
}

export function Select({ className = '', error, children, ...rest }) {
  return (
    <select className={`field appearance-none pr-9 ${error ? 'field-error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  )
}
