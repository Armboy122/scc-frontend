import type { BorrowStatus, CoverStatus, WorkOrderStatus } from '@/lib/types'
import type { WorkOrder } from '@/lib/types'
import { getWorkOrderDisplayStatusConfig } from '@/lib/workOrderDisplayStatus'

// ─── Work order status config ─────────────────────────────────────────────────

interface BadgeConfig {
  label: string
  className: string
}

const WORK_ORDER_CONFIG: Record<WorkOrderStatus, BadgeConfig> = {
  SCHEDULED: {
    label: 'รอติดตั้ง',
    className: 'bg-slate-50 text-slate-800 border-slate-200',
  },
  ACTIVE: {
    label: 'ติดตั้ง',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  REMOVAL_DUE: {
    label: 'ครบกำหนด',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  REMOVING: {
    label: 'กำลังถอด',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  COMPLETED: {
    label: 'เสร็จสิ้น',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
}

const COVER_CONFIG: Record<CoverStatus, BadgeConfig> = {
  IN_STOCK: {
    label: 'พร้อมติดตั้ง',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  INSTALLED: {
    label: 'ติดตั้ง',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  RETIRED: {
    label: 'ปลดออก',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
}

const BORROW_CONFIG: Record<BorrowStatus, BadgeConfig> = {
  REQUESTED: {
    label: 'รออนุมัติ',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  ON_LOAN: {
    label: 'ยืมอยู่',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  RETURNED: {
    label: 'คืนแล้ว',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  REJECTED: {
    label: 'ปฏิเสธ',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  OVERDUE: {
    label: 'เกินกำหนด',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkOrderBadgeProps {
  status: WorkOrderStatus
  size?: 'sm' | 'md'
}

interface WorkOrderEntityBadgeProps {
  workOrder: WorkOrder
  size?: 'sm' | 'md'
}

interface CoverBadgeProps {
  coverStatus: CoverStatus
  size?: 'sm' | 'md'
}

interface BorrowBadgeProps {
  borrowStatus: BorrowStatus
  size?: 'sm' | 'md'
}

type StatusBadgeProps = WorkOrderBadgeProps | WorkOrderEntityBadgeProps | CoverBadgeProps | BorrowBadgeProps

function isWorkOrderBadge(p: StatusBadgeProps): p is WorkOrderBadgeProps {
  return 'status' in p
}

function isWorkOrderEntityBadge(p: StatusBadgeProps): p is WorkOrderEntityBadgeProps {
  return 'workOrder' in p
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
}

export function StatusBadge(props: StatusBadgeProps) {
  const size = props.size ?? 'md'
  const config = isWorkOrderEntityBadge(props)
    ? getWorkOrderDisplayStatusConfig(props.workOrder)
    : isWorkOrderBadge(props)
    ? WORK_ORDER_CONFIG[props.status]
    : 'coverStatus' in props
      ? COVER_CONFIG[props.coverStatus]
      : BORROW_CONFIG[props.borrowStatus]

  return (
    <span
      className={[
        'badge',
        sizeClasses[size],
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  )
}
