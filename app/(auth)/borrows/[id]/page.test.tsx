import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Borrow, BorrowStatus, Role } from '@/lib/types'
import type { BorrowAction } from '@/lib/borrowPresentation'
import { BorrowDetailContent } from './BorrowDetailContent'

const {
  backMock,
  useAuthMock,
  useBorrowActionMock,
  useBorrowMock,
} = vi.hoisted(() => ({
  backMock: vi.fn(),
  useAuthMock: vi.fn(),
  useBorrowActionMock: vi.fn(),
  useBorrowMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('@/hooks/useBorrows', () => ({
  useBorrow: useBorrowMock,
  useBorrowAction: useBorrowActionMock,
}))

function makeBorrow(status: BorrowStatus = 'REQUESTED'): Borrow {
  return {
    id: 'borrow-1',
    status,
    borrowerOffice: { id: 'borrower-office', name: 'สำนักงานผู้ยืม', workHubId: 'hub-1' },
    lenderOffice: { id: 'lender-office', name: 'สำนักงานผู้ให้ยืม', workHubId: 'hub-2' },
    requestedQty: 2,
    covers: [{
      id: 'cover-1',
      assetCode: 'PEA-001',
      status: 'IN_STOCK',
      ownerOfficeId: 'lender-office',
      currentOfficeId: 'lender-office',
    }],
    returnDate: '2026-08-31T16:59:59Z',
    note: 'ใช้กับงานเร่งด่วน',
    createdById: 'creator-tech',
    approvedById: status === 'APPROVED' ? 'lender-exec' : null,
    activatedById: null,
    returnedById: null,
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
    activatedAt: null,
    returnedAt: null,
  }
}

function setActor(role: Role, id: string, officeId?: string) {
  useAuthMock.mockReturnValue({
    user: { id, role, officeId, name: id, username: id },
  })
}

function renderPage() {
  return render(<BorrowDetailContent id="borrow-1" />)
}

describe('BorrowDetailPage canonical contract', () => {
  const refetch = vi.fn()
  let actionMutations: Record<BorrowAction, {
    mutateAsync: ReturnType<typeof vi.fn>
    isPending: boolean
    error: Error | null
  }>

  beforeEach(() => {
    vi.clearAllMocks()
    setActor('exec', 'lender-exec', 'lender-office')
    useBorrowMock.mockReturnValue({
      data: makeBorrow(),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    })
    actionMutations = {
      approve: { mutateAsync: vi.fn().mockResolvedValue(makeBorrow('APPROVED')), isPending: false, error: null },
      reject: { mutateAsync: vi.fn().mockResolvedValue(makeBorrow('REJECTED')), isPending: false, error: null },
      cancel: { mutateAsync: vi.fn().mockResolvedValue(makeBorrow('CANCELLED')), isPending: false, error: null },
      activate: { mutateAsync: vi.fn().mockResolvedValue(makeBorrow('ON_LOAN')), isPending: false, error: null },
      return: { mutateAsync: vi.fn().mockResolvedValue(makeBorrow('RETURNED')), isPending: false, error: null },
    }
    useBorrowActionMock.mockImplementation((action: BorrowAction) => actionMutations[action])
  })

  it('renders the canonical office route, quantity, cover summary, note and action DTO', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('สำนักงานผู้ให้ยืม')).toBeInTheDocument()
    expect(screen.getByText('สำนักงานผู้ยืม')).toBeInTheDocument()
    expect(screen.getByText('PEA-001')).toBeInTheDocument()
    expect(screen.getByText('ใช้กับงานเร่งด่วน')).toBeInTheDocument()
    expect(screen.queryByText(/SCC:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'อนุมัติคำขอ' }))
    await waitFor(() => expect(actionMutations.approve.mutateAsync).toHaveBeenCalledWith({
      id: 'borrow-1',
    }))
  })

  it('requires an audited reason for Admin support activation', async () => {
    const user = userEvent.setup()
    setActor('admin', 'admin-1')
    useBorrowMock.mockReturnValue({
      data: makeBorrow('APPROVED'),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'ยืนยันส่งมอบฉนวน' }))
    expect(screen.getByLabelText(/เหตุผล \(จำเป็น\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ยืนยันการดำเนินการ' }))
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาระบุเหตุผล')
    expect(actionMutations.activate.mutateAsync).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/เหตุผล \(จำเป็น\)/), 'ตรวจสอบหน้างานแล้ว')
    await user.click(screen.getByRole('button', { name: 'ยืนยันการดำเนินการ' }))
    await waitFor(() => expect(actionMutations.activate.mutateAsync).toHaveBeenCalledWith({
      id: 'borrow-1',
      reason: 'ตรวจสอบหน้างานแล้ว',
    }))
  })

  it('shows Admin a clear read-only state for business approval', async () => {
    setActor('admin', 'admin-1')
    renderPage()

    expect(await screen.findByText(/ผู้ดูแลระบบไม่ใช่ผู้อนุมัติ/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'อนุมัติคำขอ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ปฏิเสธคำขอ' })).not.toBeInTheDocument()
  })

  it('renders a retryable detail error state', async () => {
    const user = userEvent.setup()
    useBorrowMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('failed'),
      refetch,
    })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่สามารถโหลดรายละเอียดใบยืมได้')
    await user.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders an explicit loading state', () => {
    useBorrowMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch,
    })
    renderPage()

    expect(screen.getByLabelText('กำลังโหลดรายละเอียดใบยืม')).toBeInTheDocument()
  })
})
