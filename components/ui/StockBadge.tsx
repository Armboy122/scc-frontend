interface StockBadgeProps {
  count: number
  /** Warning threshold — badge turns orange when count <= this */
  warnBelow?: number
  /** Critical threshold — badge turns red when count <= this */
  criticalBelow?: number
  label?: string
}

export function StockBadge({
  count,
  warnBelow = 5,
  criticalBelow = 1,
  label,
}: StockBadgeProps) {
  let colorClass = 'bg-green-50 text-green-700 border-green-200'
  if (count <= criticalBelow) {
    colorClass = 'bg-red-50 text-red-700 border-red-200'
  } else if (count <= warnBelow) {
    colorClass = 'bg-orange-50 text-orange-700 border-orange-200'
  }

  return (
    <span className={['badge', colorClass].join(' ')}>
      {count}
      {label ? ` ${label}` : ' ชิ้น'}
    </span>
  )
}
