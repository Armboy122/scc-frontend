import { describe, expect, it } from 'vitest'
import {
  getNotificationHref,
  getNotificationTitle,
} from './notificationPresentation'
import type { Notification, NotificationType } from './types'

describe('notification presentation', () => {
  it.each<[NotificationType, string]>([
    ['REMOVAL_DUE', 'ถึงกำหนดถอดฉนวน'],
    ['BORROW_REQUESTED', 'คำขอยืมฉนวนใหม่'],
    ['BORROW_APPROVED', 'คำขอยืมได้รับอนุมัติ'],
    ['BORROW_REJECTED', 'คำขอยืมถูกปฏิเสธ'],
    ['BORROW_ACTIVATED', 'ยืนยันส่งมอบฉนวนแล้ว'],
    ['BORROW_OVERDUE', 'การยืมฉนวนเกินกำหนด'],
    ['BORROW_RETURNED', 'รับคืนฉนวนแล้ว'],
    ['DISCREPANCY_REPORTED', 'พบข้อคลาดเคลื่อนใหม่'],
    ['DISCREPANCY_RESOLVED', 'ข้อคลาดเคลื่อนได้รับการปิดเรื่อง'],
    ['WORKORDER_ASSIGNED', 'ได้รับมอบหมายใบงาน'],
  ])('derives a safe title for %s', (type, title) => {
    expect(getNotificationTitle(type)).toBe(title)
  })

  it('falls back safely for a future notification type', () => {
    expect(getNotificationTitle('FUTURE_EVENT')).toBe('การแจ้งเตือน')
  })

  it('links work-order notifications to their exact entities', () => {
    const base = {
      id: 'notification-1',
      userId: 'user-1',
      message: 'message',
      createdAt: '2026-07-10T00:00:00Z',
    }
    const workOrderNotification: Notification = {
      ...base,
      type: 'REMOVAL_DUE',
      workOrderId: 'wo/1',
    }
    expect(getNotificationHref(workOrderNotification)).toBe('/workorders/wo%2F1')
  })

  it.each<NotificationType>([
    'BORROW_REQUESTED',
    'BORROW_APPROVED',
    'BORROW_REJECTED',
    'BORROW_ACTIVATED',
    'BORROW_OVERDUE',
    'BORROW_RETURNED',
  ])('links %s to its exact borrow entity', (type) => {
    expect(getNotificationHref({
      type,
      borrowId: 'borrow/1',
    })).toBe('/borrows/borrow%2F1')
  })

  it.each<NotificationType>([
    'DISCREPANCY_REPORTED',
    'DISCREPANCY_RESOLVED',
  ])('links %s to its exact discrepancy entity', (type) => {
    expect(getNotificationHref({
      type,
      discrepancyId: 'discrepancy/1',
    })).toBe('/discrepancies/discrepancy%2F1')
  })
})
