import type { Borrow, BorrowStatus, Role, User } from '@/lib/types'

export type BorrowAction = 'approve' | 'reject' | 'cancel' | 'activate' | 'return'
export type BorrowActionReason = 'none' | 'optional' | 'required'

export interface BorrowActionPermission {
  action: BorrowAction
  reason: BorrowActionReason
}

type BorrowActor = Pick<User, 'id' | 'role' | 'officeId'>

const CANCELLABLE_STATUSES: BorrowStatus[] = ['REQUESTED', 'APPROVED']

export function getBorrowActionPermissions(
  borrow: Borrow,
  actor: BorrowActor | null | undefined,
): BorrowActionPermission[] {
  if (!actor) return []

  if (actor.role === 'admin') {
    if (borrow.status === 'APPROVED') {
      return [{ action: 'activate', reason: 'required' }]
    }
    if (borrow.status === 'ON_LOAN' || borrow.status === 'OVERDUE') {
      return [{ action: 'return', reason: 'required' }]
    }
    return []
  }

  if (!actor.officeId) return []

  const isBorrowerOffice = actor.officeId === borrow.borrowerOffice.id
  const isLenderOffice = actor.officeId === borrow.lenderOffice.id
  const isCreator = actor.id === borrow.createdById
  const permissions: BorrowActionPermission[] = []

  if (CANCELLABLE_STATUSES.includes(borrow.status) && isBorrowerOffice) {
    if (actor.role === 'exec' || (actor.role === 'tech' && isCreator)) {
      permissions.push({ action: 'cancel', reason: 'optional' })
    }
  }

  if (actor.role !== 'exec' || !isLenderOffice) return permissions

  if (borrow.status === 'REQUESTED') {
    permissions.push(
      { action: 'reject', reason: 'required' },
      { action: 'approve', reason: 'none' },
    )
  } else if (borrow.status === 'APPROVED') {
    permissions.push({ action: 'activate', reason: 'none' })
  } else if (borrow.status === 'ON_LOAN' || borrow.status === 'OVERDUE') {
    permissions.push({ action: 'return', reason: 'none' })
  }

  return permissions
}

export function getBorrowReadOnlyMessage(borrow: Borrow, role: Role | undefined): string {
  if (role === 'admin') {
    return 'โหมดอ่านอย่างเดียว: ผู้ดูแลระบบไม่ใช่ผู้อนุมัติหรือผู้ยกเลิกคำขอทางธุรกิจ'
  }

  if (['RETURNED', 'REJECTED', 'CANCELLED'].includes(borrow.status)) {
    return 'โหมดอ่านอย่างเดียว: รายการนี้สิ้นสุดแล้วและไม่มีการดำเนินการถัดไป'
  }

  return 'โหมดอ่านอย่างเดียว: บัญชีนี้ไม่มีสิทธิ์ดำเนินการกับรายการในสถานะปัจจุบัน'
}
