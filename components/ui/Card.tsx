interface CardProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  onClick?: () => void
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
  onClick,
  hoverable = false,
  padding = 'md',
}: CardProps) {
  return (
    <Tag
      className={[
        'card-surface',
        paddingClasses[padding],
        hoverable
          ? 'cursor-pointer transition-shadow duration-[--duration-fast] hover:shadow-card-hover'
          : '',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={['flex items-start justify-between gap-3 mb-4', className].join(' ')}>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
