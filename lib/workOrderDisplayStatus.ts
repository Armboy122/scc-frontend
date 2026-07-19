import type { WorkOrder } from './types'

export type WorkOrderDisplayStatus =
  | 'PENDING_INSTALL'
  | 'INSTALLED'
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'REMOVING'
  | 'COMPLETED'
  | 'CANCELLED'

export interface WorkOrderDisplayStatusConfig {
  value: WorkOrderDisplayStatus
  label: string
  className: string
}

const DAY_MS = 86_400_000
const DUE_SOON_DAYS = 7
const BUSINESS_TIME_ZONE = 'Asia/Bangkok'
const BUSINESS_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const WORK_ORDER_DISPLAY_STATUS_CONFIG: Record<WorkOrderDisplayStatus, WorkOrderDisplayStatusConfig> = {
  PENDING_INSTALL: {
    value: 'PENDING_INSTALL',
    label: 'รอติดตั้ง',
    className: 'bg-slate-50 text-slate-800 border-slate-200',
  },
  INSTALLED: {
    value: 'INSTALLED',
    label: 'ติดตั้ง',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  DUE_SOON: {
    value: 'DUE_SOON',
    label: 'ใกล้ครบ',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  DUE_TODAY: {
    value: 'DUE_TODAY',
    label: 'ครบกำหนด',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  OVERDUE: {
    value: 'OVERDUE',
    label: 'เกินกำหนด',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  REMOVING: {
    value: 'REMOVING',
    label: 'กำลังถอด',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  COMPLETED: {
    value: 'COMPLETED',
    label: 'เสร็จสิ้น',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  CANCELLED: {
    value: 'CANCELLED',
    label: 'ยกเลิก',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
}

function businessDay(value: Date): number {
  const parts = BUSINESS_DATE_FORMATTER.formatToParts(value)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  if (![year, month, day].every(Number.isInteger)) return Number.NaN
  return Date.UTC(year, month - 1, day)
}

function parseDateOnly(iso?: string): number | null {
  if (!iso) return null
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return null
  const day = businessDay(value)
  return Number.isNaN(day) ? null : day
}

export function getWorkOrderDisplayStatus(order: WorkOrder, now: Date = new Date()): WorkOrderDisplayStatus {
  if (order.status === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (order.status === 'CANCELLED') {
    return 'CANCELLED'
  }

  if (order.status === 'SCHEDULED') {
    return 'PENDING_INSTALL'
  }

  if (order.status === 'REMOVING') {
    return 'REMOVING'
  }

  const removalDay = parseDateOnly(order.removalDate)
  if (removalDay === null) {
    return order.status === 'REMOVAL_DUE' ? 'DUE_TODAY' : 'INSTALLED'
  }

  const today = businessDay(now)
  const daysLeft = Math.round((removalDay - today) / DAY_MS)

  if (daysLeft < 0) return 'OVERDUE'
  if (daysLeft === 0 || order.status === 'REMOVAL_DUE') return 'DUE_TODAY'
  if (daysLeft <= DUE_SOON_DAYS) return 'DUE_SOON'
  return 'INSTALLED'
}

export function getWorkOrderDisplayStatusConfig(
  order: WorkOrder,
  now?: Date,
): WorkOrderDisplayStatusConfig {
  return WORK_ORDER_DISPLAY_STATUS_CONFIG[getWorkOrderDisplayStatus(order, now)]
}
