import type { Notification, NotificationType } from './types'

const TITLES: Record<NotificationType, string> = {
  REMOVAL_DUE: 'ถึงกำหนดถอดฉนวน',
  BORROW_REQUESTED: 'คำขอยืมฉนวนใหม่',
  BORROW_APPROVED: 'คำขอยืมได้รับอนุมัติ',
  BORROW_REJECTED: 'คำขอยืมถูกปฏิเสธ',
  BORROW_ACTIVATED: 'ยืนยันส่งมอบฉนวนแล้ว',
  BORROW_OVERDUE: 'การยืมฉนวนเกินกำหนด',
  BORROW_RETURNED: 'รับคืนฉนวนแล้ว',
  DISCREPANCY_REPORTED: 'พบข้อคลาดเคลื่อนใหม่',
  DISCREPANCY_RESOLVED: 'ข้อคลาดเคลื่อนได้รับการปิดเรื่อง',
  WORKORDER_ASSIGNED: 'ได้รับมอบหมายใบงาน',
}

const BORROW_NOTIFICATION_TYPES = new Set<NotificationType>([
  'BORROW_REQUESTED',
  'BORROW_APPROVED',
  'BORROW_REJECTED',
  'BORROW_ACTIVATED',
  'BORROW_OVERDUE',
  'BORROW_RETURNED',
])

export function getNotificationTitle(type: string): string {
  return TITLES[type as NotificationType] ?? 'การแจ้งเตือน'
}

export function getNotificationHref(
  notification: Pick<Notification, 'type' | 'workOrderId' | 'borrowId' | 'discrepancyId'>,
): string | null {
  if (
    (notification.type === 'DISCREPANCY_REPORTED' || notification.type === 'DISCREPANCY_RESOLVED')
    && notification.discrepancyId
  ) {
    return `/discrepancies/${encodeURIComponent(notification.discrepancyId)}`
  }
  if (
    (notification.type === 'REMOVAL_DUE' || notification.type === 'WORKORDER_ASSIGNED')
    && notification.workOrderId
  ) {
    return `/workorders/${encodeURIComponent(notification.workOrderId)}`
  }

  if (BORROW_NOTIFICATION_TYPES.has(notification.type) && notification.borrowId) {
    return `/borrows/${encodeURIComponent(notification.borrowId)}`
  }

  if (notification.workOrderId) {
    return `/workorders/${encodeURIComponent(notification.workOrderId)}`
  }
  if (notification.borrowId) {
    return `/borrows/${encodeURIComponent(notification.borrowId)}`
  }
  if (notification.discrepancyId) {
    return `/discrepancies/${encodeURIComponent(notification.discrepancyId)}`
  }
  return null
}
