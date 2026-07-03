import type { WorkOrder } from './types'

export type WorkOrderDisplayStatus =
  | 'PENDING_INSTALL'
  | 'INSTALLED'
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE'

export interface WorkOrderDisplayStatusConfig {
  value: WorkOrderDisplayStatus
  label: string
  className: string
}

const DAY_MS = 86_400_000
const DUE_SOON_DAYS = 7

export const WORK_ORDER_DISPLAY_STATUS_CONFIG: Record<WorkOrderDisplayStatus, WorkOrderDisplayStatusConfig> = {
  PENDING_INSTALL: {
    value: 'PENDING_INSTALL',
    label: 'รอติดตั้ง',
    className: 'bg-[--status-scheduled-bg] text-[--status-scheduled] border-slate-200',
  },
  INSTALLED: {
    value: 'INSTALLED',
    label: 'ติดตั้ง',
    className: 'bg-[--status-active-bg] text-[--status-active] border-green-200',
  },
  DUE_SOON: {
    value: 'DUE_SOON',
    label: 'ใกล้ครบ',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  DUE_TODAY: {
    value: 'DUE_TODAY',
    label: 'ครบกำหนด',
    className: 'bg-[--status-removal-due-bg] text-[--status-removal-due] border-orange-200',
  },
  OVERDUE: {
    value: 'OVERDUE',
    label: 'เกินกำหนด',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

function parseDateOnly(iso?: string): number | null {
  if (!iso) return null
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return null
  return startOfDay(value)
}

export function getWorkOrderDisplayStatus(order: WorkOrder, now: Date = new Date()): WorkOrderDisplayStatus {
  if (order.status === 'SCHEDULED' || order.status === 'INSTALLING') {
    return 'PENDING_INSTALL'
  }

  const removalDay = parseDateOnly(order.removalDate)
  if (removalDay === null) return 'INSTALLED'

  const today = startOfDay(now)
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
