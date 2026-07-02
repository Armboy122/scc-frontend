import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftAddon, id, className = '', ...props },
  ref,
) {
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="absolute left-3 text-gray-400 pointer-events-none">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={[
            'w-full h-12 px-3 rounded-xl border text-base',
            'bg-white text-gray-900 placeholder:text-gray-400',
            'transition-colors duration-[--duration-fast]',
            'focus:outline-none focus:ring-2 focus:ring-pea-500 focus:border-pea-500',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-gray-300 hover:border-gray-400',
            leftAddon ? 'pl-9' : '',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
})
