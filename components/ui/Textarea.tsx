import { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = '', ...props },
  ref,
) {
  const textareaId = id ?? `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={props.rows ?? 3}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={[
          'w-full px-3 py-3 rounded-xl border text-base resize-y min-h-[6rem]',
          'bg-white text-gray-900 placeholder:text-gray-400',
          'transition-colors duration-[--duration-fast]',
          'focus:outline-none focus:ring-2 focus:ring-pea-500 focus:border-pea-500',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-gray-300 hover:border-gray-400',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && !error && (
        <p id={`${textareaId}-hint`} className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p id={`${textareaId}-error`} role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
})
