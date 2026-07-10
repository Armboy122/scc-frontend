import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Borrow, BorrowAvailability, Role } from '@/lib/types'
import { NewBorrowForm } from './NewBorrowForm'

const {
  backMock,
  replaceMock,
  useAuthMock,
  useBorrowAvailabilityMock,
  useCreateBorrowMock,
} = vi.hoisted(() => ({
  backMock: vi.fn(),
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
  useBorrowAvailabilityMock: vi.fn(),
  useCreateBorrowMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock, replace: replaceMock }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('@/hooks/useBorrows', () => ({
  useBorrowAvailability: useBorrowAvailabilityMock,
  useCreateBorrow: useCreateBorrowMock,
}))

const availability: BorrowAvailability[] = [
  {
    office: { id: 'lender-low', name: 'สำนักงานกำลังน้อย', workHubId: 'hub-2' },
    ownedInStock: 10,
    reservedPlanned: 4,
    reservedBorrow: 1,
    borrowableCapacity: 5,
  },
  {
    office: { id: 'lender-high', name: 'สำนักงานกำลังสูง', workHubId: 'hub-3' },
    ownedInStock: 30,
    reservedPlanned: 8,
    reservedBorrow: 2,
    borrowableCapacity: 20,
  },
  {
    office: { id: 'lender-zero', name: 'สำนักงานไม่มีคงเหลือ', workHubId: 'hub-4' },
    ownedInStock: 3,
    reservedPlanned: 3,
    reservedBorrow: 0,
    borrowableCapacity: 0,
  },
]

const createdBorrow: Borrow = {
  id: 'borrow-created',
  status: 'REQUESTED',
  borrowerOffice: { id: 'borrower-office', name: 'Borrower', workHubId: 'hub-1' },
  lenderOffice: availability[1].office,
  requestedQty: 4,
  covers: [],
  returnDate: '2099-08-31T16:59:59Z',
  note: 'ด่วน',
  createdById: 'exec-1',
  approvedById: null,
  activatedById: null,
  returnedById: null,
  createdAt: '2026-07-10T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
  activatedAt: null,
  returnedAt: null,
}

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

function renderPage(search: { requestedQty?: string; returnDate?: string } = {}) {
  return render(<NewBorrowForm query={search} />)
}

describe('NewBorrowPage canonical request', () => {
  const refetch = vi.fn()
  const mutateAsync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setRole('exec')
    useBorrowAvailabilityMock.mockReturnValue({
      data: availability,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    })
    mutateAsync.mockResolvedValue(createdBorrow)
    useCreateBorrowMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      error: null,
    })
  })

  it('prefills quantity/date, selects by borrowable capacity, and submits only canonical fields', async () => {
    const user = userEvent.setup()
    renderPage({ requestedQty: '4', returnDate: '2099-08-31' })

    const quantity = await screen.findByLabelText(/จำนวนที่ขอ/)
    const returnDate = screen.getByLabelText(/กำหนดคืน/)
    const lender = screen.getByLabelText(/สำนักงานผู้ให้ยืม/)
    expect(quantity).toHaveValue(4)
    expect(returnDate).toHaveValue('2099-08-31')
    expect(screen.queryByRole('option', { name: /สำนักงานไม่มีคงเหลือ/ })).not.toBeInTheDocument()

    await user.selectOptions(lender, 'lender-high')
    await user.type(screen.getByLabelText('หมายเหตุ'), '  ด่วน  ')
    await user.click(screen.getByRole('button', { name: 'ส่งคำขอยืม' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      lenderOfficeId: 'lender-high',
      requestedQty: 4,
      returnDate: '2099-08-31T23:59:59+07:00',
      note: 'ด่วน',
    }))
    expect(replaceMock).toHaveBeenCalledWith('/borrows/borrow-created')
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).not.toHaveProperty('borrowDate')
    expect(payload).not.toHaveProperty('coverIds')
    expect(payload).not.toHaveProperty('borrowerOfficeId')
  })

  it('blocks quantities over the latest borrowable capacity before the API call', async () => {
    const user = userEvent.setup()
    renderPage({ requestedQty: '9', returnDate: '2099-08-31' })

    await user.selectOptions(await screen.findByLabelText(/สำนักงานผู้ให้ยืม/), 'lender-low')
    await user.click(screen.getByRole('button', { name: 'ส่งคำขอยืม' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ขอได้ไม่เกิน 5 ชิ้น')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('blocks a return deadline that is not in the future', async () => {
    const user = userEvent.setup()
    renderPage({ requestedQty: '1', returnDate: '2000-01-01' })

    await user.selectOptions(await screen.findByLabelText(/สำนักงานผู้ให้ยืม/), 'lender-high')
    await user.click(screen.getByRole('button', { name: 'ส่งคำขอยืม' }))

    expect(await screen.findByText('กำหนดคืนต้องอยู่ในอนาคต')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('renders retryable availability errors and disables submission', async () => {
    const user = userEvent.setup()
    useBorrowAvailabilityMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('failed'),
      refetch,
    })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่สามารถโหลดจำนวนที่เปิดให้ยืม')
    expect(screen.getByRole('button', { name: 'ส่งคำขอยืม' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('prevents Admin create UI while keeping the read route available', async () => {
    setRole('admin')
    renderPage()

    expect(await screen.findByText('หน้านี้เป็นโหมดอ่านอย่างเดียว')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ส่งคำขอยืม' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปหน้าใบยืม' })).toHaveAttribute('href', '/borrows')
    expect(useBorrowAvailabilityMock).toHaveBeenCalledWith(false)
  })
})
