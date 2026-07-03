import { describe, expect, it } from 'vitest'
import type { WorkOrder } from './types'
import { getWorkOrderDisplayStatus, getWorkOrderDisplayStatusConfig } from './workOrderDisplayStatus'

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    status: 'ACTIVE',
    customerName: 'PEA Customer',
    plannedQty: 1,
    officeId: 'office-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('getWorkOrderDisplayStatus', () => {
  const now = new Date('2026-07-04T12:00:00+07:00')

  it('maps scheduled work to รอติดตั้ง', () => {
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ status: 'SCHEDULED' }), now)).toBe('PENDING_INSTALL')
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ status: 'INSTALLING' }), now)).toBe('PENDING_INSTALL')
  })

  it('maps active work by removal due date', () => {
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ removalDate: '2026-07-20T00:00:00+07:00' }), now)).toBe('INSTALLED')
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ removalDate: '2026-07-08T00:00:00+07:00' }), now)).toBe('DUE_SOON')
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ removalDate: '2026-07-04T00:00:00+07:00' }), now)).toBe('DUE_TODAY')
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ removalDate: '2026-07-03T00:00:00+07:00' }), now)).toBe('OVERDUE')
  })

  it('does not expose technical removing status as a separate display state', () => {
    expect(getWorkOrderDisplayStatus(makeWorkOrder({ status: 'REMOVING', removalDate: '2026-07-20T00:00:00+07:00' }), now)).toBe('INSTALLED')
  })

  it('always displays completed work orders as เสร็จสิ้น even when removal date is due', () => {
    const order = makeWorkOrder({
      status: 'COMPLETED',
      removalDate: '2026-07-04T00:00:00+07:00',
    })

    expect(getWorkOrderDisplayStatus(order, now)).toBe('COMPLETED')
    expect(getWorkOrderDisplayStatusConfig(order, now).label).toBe('เสร็จสิ้น')
  })
})
