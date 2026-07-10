import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, id, className = '', ...props },
  ref,
) {
  const selectId = id ?? `select-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={[
            'w-full h-12 px-3 pr-10 rounded-xl border text-base appearance-none',
            'bg-white text-gray-900',
            'transition-colors duration-[--duration-fast]',
            'focus:outline-none focus:ring-2 focus:ring-pea-500 focus:border-pea-500',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-gray-400',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden
        />
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
})
