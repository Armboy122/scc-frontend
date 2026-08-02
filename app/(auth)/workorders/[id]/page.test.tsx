import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkOrder } from '@/lib/types'
import WorkOrderDetailPage from './page'

const { mutateAsyncMock, refetchMock, useAuthMock, useWorkOrderMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  refetchMock: vi.fn(),
  useAuthMock: vi.fn(),
  useWorkOrderMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, use: () => ({ id: 'wo-1' }) }
})
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useWorkOrders', () => ({
  useWorkOrder: useWorkOrderMock,
  useCancelWorkOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartRemoval: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateWorkOrderServiceFee: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}))
vi.mock('@/components/feature/WorkOrderAssignmentCard', () => ({
  WorkOrderAssignmentCard: () => null,
}))

const completedOrder: WorkOrder = {
  id: 'wo-1',
  status: 'COMPLETED',
  customerName: 'ลูกค้าจริง',
  plannedQty: 3,
  actualQty: 3,
  officeId: 'office-62',
  usageType: 'CUSTOMER_COVER',
  serviceFeeIncludingVatSatang: 6623300,
  installDate: '2026-06-08T00:00:00+07:00',
  removalDate: '2026-06-09T00:00:00+07:00',
  createdAt: '2026-06-08T00:00:00+07:00',
  updatedAt: '2026-06-09T17:00:00+07:00',
}

describe('WorkOrderDetailPage service fee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: { id: 'exec-1', name: 'Exec', role: 'exec', officeId: 'office-62' } })
    useWorkOrderMock.mockReturnValue({ data: completedOrder, isLoading: false, error: null, refetch: refetchMock })
    mutateAsyncMock.mockResolvedValue({ data: completedOrder })
  })

  it('shows the fee and lets Exec clear it even after completion', async () => {
    const user = userEvent.setup()
    render(<WorkOrderDetailPage params={Promise.resolve({ id: 'wo-1' })} />)

    expect(screen.getByText(/66,233\.00 บาท/)).toBeInTheDocument()
    const input = await screen.findByLabelText('ค่าบริการรวม VAT 7% (บาท)')
    expect(input).toHaveValue('66233.00')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'บันทึกราคา' }))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'wo-1',
      serviceFeeIncludingVatSatang: null,
    }))
    expect(refetchMock).toHaveBeenCalled()
  })

  it('keeps the fee readable but hides editing controls from Tech', () => {
    useAuthMock.mockReturnValue({ user: { id: 'tech-1', name: 'Tech', role: 'tech', officeId: 'office-62' } })
    render(<WorkOrderDetailPage params={Promise.resolve({ id: 'wo-1' })} />)

    expect(screen.getByText(/66,233\.00 บาท/)).toBeInTheDocument()
    expect(screen.queryByLabelText('ค่าบริการรวม VAT 7% (บาท)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'บันทึกราคา' })).not.toBeInTheDocument()
  })

  it('shows every installed cover by its physical asset code', () => {
    useWorkOrderMock.mockReturnValue({
      data: {
        ...completedOrder,
        plannedQty: 4,
        actualQty: 4,
        installations: [1, 2, 3, 4].map((number) => ({
          id: `installation-${number}`,
          workOrderId: completedOrder.id,
          coverId: `cover-${number}`,
          coverAssetCode: `PEA${String(number).padStart(10, '0')}`,
          createdAt: completedOrder.createdAt,
        })),
      },
      isLoading: false,
      error: null,
      refetch: refetchMock,
    })

    render(<WorkOrderDetailPage params={Promise.resolve({ id: 'wo-1' })} />)

    expect(screen.getByText('ฉนวนที่ติดตั้ง (4 ชิ้น)')).toBeInTheDocument()
    for (const number of [1, 2, 3, 4]) {
      expect(screen.getByText(`PEA${String(number).padStart(10, '0')}`)).toBeInTheDocument()
    }
    expect(screen.queryByText(/ฉนวนรายการที่/)).not.toBeInTheDocument()
  })
})
