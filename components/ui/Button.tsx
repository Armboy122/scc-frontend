import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-pea-600 text-white border-pea-600 hover:bg-pea-700 active:bg-pea-800 focus-visible:ring-pea-500 shadow-sm',
  secondary:
    'bg-white text-pea-700 border-pea-200 hover:bg-pea-50 active:bg-pea-100 focus-visible:ring-pea-500',
  danger:
    'bg-red-600 text-white border-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm',
  ghost:
    'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
  outline:
    'bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400',
}

const sizeClasses: Record<Size, string> = {
  sm:  'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md:  'h-10 px-4 text-sm gap-2 rounded-xl',
  lg:  'h-12 px-5 text-base gap-2 rounded-xl',
  xl:  'h-14 px-6 text-lg gap-2.5 rounded-2xl font-semibold',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    children,
    disabled,
    className = '',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center font-medium border',
        'transition-colors duration-[--duration-fast] ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'select-none',
        // Variant + size
        variantClasses[variant],
        sizeClasses[size],
        // Width
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : leftIcon ? (
        <span className="flex-shrink-0" aria-hidden>{leftIcon}</span>
      ) : null}
      {children}
    </button>
  )
})
