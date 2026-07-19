import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewWorkOrderPage from './page'

const {
  useAuthMock,
  useCreateWorkOrderMock,
  useOfficeStockMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useCreateWorkOrderMock: vi.fn(),
  useOfficeStockMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/lib/featureFlags', () => ({
  PHASE_FEATURE_FLAGS: { phase2Borrowing: true, phase3Expansion: false },
}))
vi.mock('@/hooks/useWorkOrders', () => ({
  useCreateWorkOrder: useCreateWorkOrderMock,
}))
vi.mock('@/hooks/useStock', () => ({
  useOfficeStock: useOfficeStockMock,
}))
vi.mock('@/components/feature/GpsPicker', () => ({
  GpsPicker: () => <div data-testid="gps-picker" />,
}))

describe('NewWorkOrderPage stock recovery path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      user: { id: 'exec-1', name: 'Exec', role: 'exec', officeId: 'office-1' },
    })
    useCreateWorkOrderMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })
    useOfficeStockMock.mockReturnValue({
      data: {
        officeId: 'office-1',
        inStock: 5,
        reservedPlanned: 3,
        reservedBorrow: 0,
        availableForWorkOrder: 2,
        installed: 0,
        onLoanOut: 0,
        onLoanIn: 0,
        total: 5,
      },
    })
  })

  it('links an insufficient plan to a Phase 2 borrow form prefilled with the shortfall and return date', async () => {
    const user = userEvent.setup()
    render(<NewWorkOrderPage />)

    const plannedQty = screen.getByLabelText(/จำนวนฉนวน/)
    await user.clear(plannedQty)
    await user.type(plannedQty, '5')
    await user.selectOptions(screen.getByLabelText('วันถอด ปี พ.ศ.'), '2642')
    await user.selectOptions(screen.getByLabelText('วันถอด เดือน'), '8')
    await user.selectOptions(screen.getByLabelText('วันถอด วัน'), '31')

    expect(await screen.findByRole('link', { name: /ขอยืมเพิ่ม 3 ชิ้น/ })).toHaveAttribute(
      'href',
      '/borrows/new?requestedQty=3&returnDate=2099-08-31',
    )
    expect(screen.getByRole('button', { name: 'สร้างใบงาน' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('ยังสร้างใบงานไม่ได้: สต็อกขาด 3 ชิ้น')
  })
})
