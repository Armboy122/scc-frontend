import type { BorrowStatus, CoverStatus, WorkOrderStatus } from '@/lib/types'

// ─── Work order status config ─────────────────────────────────────────────────

interface BadgeConfig {
  label: string
  className: string
}

const WORK_ORDER_CONFIG: Record<WorkOrderStatus, BadgeConfig> = {
  SCHEDULED: {
    label: 'รอดำเนินการ',
    className: 'bg-[--status-scheduled-bg] text-[--status-scheduled] border-slate-200',
  },
  INSTALLING: {
    label: 'กำลังติดตั้ง',
    className: 'bg-[--status-installing-bg] text-[--status-installing] border-blue-200',
  },
  ACTIVE: {
    label: 'ใช้งานอยู่',
    className: 'bg-[--status-active-bg] text-[--status-active] border-green-200',
  },
  REMOVAL_DUE: {
    label: 'ถึงกำหนดถอด',
    className: 'bg-[--status-removal-due-bg] text-[--status-removal-due] border-orange-200',
  },
  REMOVING: {
    label: 'กำลังถอด',
    className: 'bg-[--status-removing-bg] text-[--status-removing] border-violet-200',
  },
  COMPLETED: {
    label: 'เสร็จสิ้น',
    className: 'bg-[--status-completed-bg] text-[--status-completed] border-emerald-200',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    className: 'bg-[--status-cancelled-bg] text-[--status-cancelled] border-gray-200',
  },
}

const COVER_CONFIG: Record<CoverStatus, BadgeConfig> = {
  IN_STOCK: {
    label: 'ในคลัง',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  INSTALLED: {
    label: 'ติดตั้งแล้ว',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RETIRED: {
    label: 'เลิกใช้',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
}

const BORROW_CONFIG: Record<BorrowStatus, BadgeConfig> = {
  REQUESTED: {
    label: 'รออนุมัติ',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  ON_LOAN: {
    label: 'ยืมอยู่',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RETURNED: {
    label: 'คืนแล้ว',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'ปฏิเสธ',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
  OVERDUE: {
    label: 'เกินกำหนด',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkOrderBadgeProps {
  status: WorkOrderStatus
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

type StatusBadgeProps = WorkOrderBadgeProps | CoverBadgeProps | BorrowBadgeProps

function isWorkOrderBadge(p: StatusBadgeProps): p is WorkOrderBadgeProps {
  return 'status' in p
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
}

export function StatusBadge(props: StatusBadgeProps) {
  const size = props.size ?? 'md'
  const config = isWorkOrderBadge(props)
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
