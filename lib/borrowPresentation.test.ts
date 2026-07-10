import { describe, expect, it } from 'vitest'
import type { Borrow, BorrowStatus, Role } from './types'
import { getBorrowActionPermissions, getBorrowReadOnlyMessage } from './borrowPresentation'

function makeBorrow(status: BorrowStatus, overrides: Partial<Borrow> = {}): Borrow {
  return {
    id: 'borrow-1',
    status,
    borrowerOffice: { id: 'borrower-office', name: 'Borrower', workHubId: 'hub-1' },
    lenderOffice: { id: 'lender-office', name: 'Lender', workHubId: 'hub-2' },
    requestedQty: 2,
    covers: [],
    returnDate: '2026-08-31T16:59:59Z',
    note: null,
    createdById: 'creator-tech',
    approvedById: null,
    activatedById: null,
    returnedById: null,
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
    activatedAt: null,
    returnedAt: null,
    ...overrides,
  }
}

function actor(id: string, role: Role, officeId?: string) {
  return { id, role, officeId }
}

function actions(borrow: Borrow, currentActor: ReturnType<typeof actor>) {
  return getBorrowActionPermissions(borrow, currentActor)
    .map(({ action, reason }) => `${action}:${reason}`)
}

describe('canonical borrow actor/action matrix', () => {
  it.each([
    ['REQUESTED', ['reject:required', 'approve:none']],
    ['APPROVED', ['activate:none']],
    ['ON_LOAN', ['return:none']],
    ['OVERDUE', ['return:none']],
    ['RETURNED', []],
    ['REJECTED', []],
    ['CANCELLED', []],
  ] satisfies [BorrowStatus, string[]][])('gives lender Exec only the valid %s actions', (status, expected) => {
    expect(actions(makeBorrow(status), actor('lender-exec', 'exec', 'lender-office'))).toEqual(expected)
  })

  it.each([
    ['REQUESTED', ['cancel:optional']],
    ['APPROVED', ['cancel:optional']],
    ['ON_LOAN', []],
    ['OVERDUE', []],
    ['RETURNED', []],
  ] satisfies [BorrowStatus, string[]][])('gives borrower Exec only the valid %s actions', (status, expected) => {
    expect(actions(makeBorrow(status), actor('borrower-exec', 'exec', 'borrower-office'))).toEqual(expected)
  })

  it('lets only the borrower Tech creator cancel an active request', () => {
    const requested = makeBorrow('REQUESTED')
    const approved = makeBorrow('APPROVED')

    expect(actions(requested, actor('creator-tech', 'tech', 'borrower-office'))).toEqual([
      'cancel:optional',
    ])
    expect(actions(approved, actor('creator-tech', 'tech', 'borrower-office'))).toEqual([
      'cancel:optional',
    ])
    expect(actions(requested, actor('another-tech', 'tech', 'borrower-office'))).toEqual([])
    expect(actions(requested, actor('creator-tech', 'tech', 'lender-office'))).toEqual([])
  })

  it('gives Admin audited support activate/return but never business approval or cancel', () => {
    expect(actions(makeBorrow('REQUESTED'), actor('admin-1', 'admin'))).toEqual([])
    expect(actions(makeBorrow('APPROVED'), actor('admin-1', 'admin'))).toEqual([
      'activate:required',
    ])
    expect(actions(makeBorrow('ON_LOAN'), actor('admin-1', 'admin'))).toEqual([
      'return:required',
    ])
    expect(actions(makeBorrow('OVERDUE'), actor('admin-1', 'admin'))).toEqual([
      'return:required',
    ])
    expect(actions(
      makeBorrow('REQUESTED', { createdById: 'admin-1' }),
      actor('admin-1', 'admin'),
    )).toEqual([])
  })

  it('fails closed for missing offices, unrelated offices, and missing actors', () => {
    const requested = makeBorrow('REQUESTED')

    expect(getBorrowActionPermissions(requested, null)).toEqual([])
    expect(actions(requested, actor('exec-1', 'exec'))).toEqual([])
    expect(actions(requested, actor('exec-1', 'exec', 'unrelated-office'))).toEqual([])
  })

  it('explains read-only state instead of silently hiding every action', () => {
    expect(getBorrowReadOnlyMessage(makeBorrow('REQUESTED'), 'admin')).toContain('ผู้ดูแลระบบ')
    expect(getBorrowReadOnlyMessage(makeBorrow('RETURNED'), 'exec')).toContain('สิ้นสุดแล้ว')
    expect(getBorrowReadOnlyMessage(makeBorrow('REQUESTED'), 'tech')).toContain('ไม่มีสิทธิ์')
  })
})
