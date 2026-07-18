import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Borrow, Role } from '@/lib/types'
import BorrowsPage from './page'

const { useAuthMock, useBorrowsMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useBorrowsMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('@/hooks/useBorrows', () => ({
  useBorrows: useBorrowsMock,
}))

function setRole(role: Role) {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
      name: role,
      username: role,
      role,
      officeId: role === 'admin' ? undefined : 'borrower-office',
    },
  })
}

const borrow: Borrow = {
  id: 'borrow-1',
  status: 'REQUESTED',
  borrowerOffice: { id: 'borrower-office', name: 'สำนักงานผู้ยืม', workHubId: 'hub-1' },
  lenderOffice: { id: 'lender-office', name: 'สำนักงานผู้ให้ยืม', workHubId: 'hub-2' },
  requestedQty: 4,
  covers: [],
  returnDate: '2026-08-31T16:59:59Z',
  note: null,
  createdById: 'exec-1',
  approvedById: null,
  activatedById: null,
  returnedById: null,
  createdAt: '2026-07-10T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
  activatedAt: null,
  returnedAt: null,
}

describe('BorrowsPage canonical list', () => {
  const refetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setRole('exec')
    useBorrowsMock.mockReturnValue({
      data: [borrow],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    })
  })

  it('renders canonical lender, borrower, requested quantity and semantic detail link', () => {
    render(<BorrowsPage />)

    expect(screen.getByText('สำนักงานผู้ให้ยืม')).toBeInTheDocument()
    expect(screen.getByText('ผู้ยืม: สำนักงานผู้ยืม')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByRole('link', {
      name: 'เปิดใบยืมจาก สำนักงานผู้ให้ยืม ไป สำนักงานผู้ยืม',
    })).toHaveAttribute('href', '/borrows/borrow-1')
    expect(screen.getByRole('link', { name: /สร้างใบยืม/ })).toHaveAttribute('href', '/borrows/new')
    expect(screen.getByText(/ทำรายการยืม ส่งมอบ และรับคืนฉนวนระหว่างสำนักงานได้จากทุกอุปกรณ์/)).toBeInTheDocument()
    expect(useBorrowsMock).toHaveBeenCalledWith({ direction: 'in' })
  })

  it('changes only the canonical direction query when the actor switches views', async () => {
    const user = userEvent.setup()
    render(<BorrowsPage />)

    await user.click(screen.getByRole('button', { name: 'ให้ยืมออก' }))

    expect(useBorrowsMock).toHaveBeenLastCalledWith({ direction: 'out' })
  })

  it('shows Admin all requests as read-only and never renders create UI', () => {
    setRole('admin')
    render(<BorrowsPage />)

    expect(screen.getByText(/ผู้ดูแลระบบเห็นคำขอทุกสำนักงาน/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /สร้างใบยืม/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('ทิศทางการยืม')).not.toBeInTheDocument()
    expect(useBorrowsMock).toHaveBeenCalledWith({})
  })

  it('renders a retryable API error state', async () => {
    const user = userEvent.setup()
    useBorrowsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('failed'),
      refetch,
    })

    render(<BorrowsPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('ไม่สามารถโหลดใบยืมได้')

    await user.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders explicit loading and empty states', () => {
    useBorrowsMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch,
    })
    const { rerender } = render(<BorrowsPage />)
    expect(screen.getByLabelText('กำลังโหลดใบยืม')).toBeInTheDocument()

    useBorrowsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    })
    rerender(<BorrowsPage />)
    expect(screen.getByText('ยังไม่มีใบยืมในมุมมองนี้')).toBeInTheDocument()
  })
})
