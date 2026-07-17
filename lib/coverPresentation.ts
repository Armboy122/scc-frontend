import type { BorrowStatus, CoverStatus, WorkOrderStatus } from './types'

export type CoverAlert = 'REMOVAL_DUE_SOON' | 'REMOVAL_OVERDUE' | 'RETURN_DUE_SOON' | 'RETURN_OVERDUE'

export interface CoverPresentationInput {
  status: CoverStatus
  ownerOfficeId: string
  currentOfficeId: string
  activeBorrow?: { status: BorrowStatus; returnDate: string }
  activeWorkOrder?: { status: WorkOrderStatus; removalDate?: string }
}

export function getCoverAlerts(input: CoverPresentationInput, now = new Date()): CoverAlert[] {
  const alerts: CoverAlert[] = []
  const dueSoonEnd = new Date(now)
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 3)
  if (input.activeWorkOrder?.removalDate && !['COMPLETED', 'CANCELLED'].includes(input.activeWorkOrder.status)) {
    const removal = new Date(input.activeWorkOrder.removalDate)
    if (removal < now) alerts.push('REMOVAL_OVERDUE')
    else if (removal <= dueSoonEnd) alerts.push('REMOVAL_DUE_SOON')
  }
  if (input.activeBorrow && ['ON_LOAN', 'OVERDUE'].includes(input.activeBorrow.status)) {
    const returns = new Date(input.activeBorrow.returnDate)
    if (returns < now || input.activeBorrow.status === 'OVERDUE') alerts.push('RETURN_OVERDUE')
    else if (returns <= dueSoonEnd) alerts.push('RETURN_DUE_SOON')
  }
  return alerts
}

export function getCoverContextLabels(input: CoverPresentationInput): string[] {
  const labels = [input.status === 'IN_STOCK' ? 'พร้อมติดตั้ง' : input.status === 'INSTALLED' ? 'ติดตั้งอยู่' : 'ปลดออก']
  if (input.ownerOfficeId !== input.currentOfficeId) labels.push('ยืมอยู่')
  return labels
}
