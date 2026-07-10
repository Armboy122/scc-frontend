import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role, WorkOrder, WorkOrderStatus } from '@/lib/types'
import {
  canAssignWorkOrder,
  canManageWorkOrderAssignment,
  canUnassignWorkOrder,
  WorkOrderAssignmentCard,
} from './WorkOrderAssignmentCard'

const {
  assignMutateAsync,
  assignReset,
  unassignMutateAsync,
  unassignReset,
  useAuthMock,
  useTechniciansMock,
} = vi.hoisted(() => ({
  assignMutateAsync: vi.fn(),
  assignReset: vi.fn(),
  unassignMutateAsync: vi.fn(),
  unassignReset: vi.fn(),
  useAuthMock: vi.fn(),
  useTechniciansMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useTechnicians', () => ({ useTechnicians: useTechniciansMock }))
vi.mock('@/hooks/useWorkOrders', () => ({
  useAssignWorkOrder: () => ({
    mutateAsync: assignMutateAsync,
    reset: assignReset,
    isPending: false,
    error: null,
  }),
  useUnassignWorkOrder: () => ({
    mutateAsync: unassignMutateAsync,
    reset: unassignReset,
    isPending: false,
    error: null,
  }),
}))

function makeOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    status: 'SCHEDULED',
    customerName: 'Customer',
    plannedQty: 2,
    officeId: 'office-1',
    assignedToId: 'tech-1',
    createdAt: '2026-07-10T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    ...overrides,
  }
}

describe('WorkOrderAssignmentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assignMutateAsync.mockResolvedValue({ data: null, error: null })
    unassignMutateAsync.mockResolvedValue({ data: makeOrder({ assignedToId: undefined }), error: null })
    useAuthMock.mockReturnValue({
      user: { id: 'exec-1', name: 'Exec One', role: 'exec', officeId: 'office-1' },
    })
    useTechniciansMock.mockReturnValue({
      data: [
        { id: 'tech-1', name: 'ช่างหนึ่ง', officeId: 'office-1' },
        { id: 'tech-2', name: 'ช่างสอง', officeId: 'office-1' },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it.each<[Role, boolean]>([
    ['admin', true],
    ['exec', true],
    ['tech', false],
  ])('enforces the %s assignment role matrix', (role, allowed) => {
    expect(canManageWorkOrderAssignment(role)).toBe(allowed)
  })

  it.each<WorkOrderStatus>([
    'SCHEDULED',
    'ACTIVE',
    'REMOVAL_DUE',
    'REMOVING',
  ])('keeps assign/reassign available for managers in backend-supported %s state', (status) => {
    expect(canAssignWorkOrder(makeOrder({ status }))).toBe(true)
    render(<WorkOrderAssignmentCard order={makeOrder({ status })} />)

    expect(screen.getByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' })).toBeInTheDocument()
  })

  it.each<WorkOrderStatus>(['COMPLETED', 'CANCELLED'])(
    'keeps terminal %s assignment read-only and skips technician lookup',
    (status) => {
      expect(canAssignWorkOrder(makeOrder({ status }))).toBe(false)
      render(<WorkOrderAssignmentCard order={makeOrder({ status })} />)

      expect(screen.queryByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' })).not.toBeInTheDocument()
      expect(screen.getByText(/แสดงผู้รับผิดชอบแบบอ่านอย่างเดียว/)).toBeInTheDocument()
      expect(useTechniciansMock).toHaveBeenCalledWith('office-1', false)
    },
  )

  it('does not expose assignment controls to technicians', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'tech-1', name: 'Tech One', role: 'tech', officeId: 'office-1' },
    })

    const { container } = render(<WorkOrderAssignmentCard order={makeOrder()} />)

    expect(container).toBeEmptyDOMElement()
    expect(useTechniciansMock).toHaveBeenCalledWith('office-1', false)
  })

  it('reassigns to a selected active technician from the scoped endpoint', async () => {
    const user = userEvent.setup()
    render(<WorkOrderAssignmentCard order={makeOrder()} />)

    await user.selectOptions(screen.getByLabelText('ช่างผู้รับผิดชอบ'), 'tech-2')
    await user.click(screen.getByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' }))

    await waitFor(() => {
      expect(assignMutateAsync).toHaveBeenCalledWith({ id: 'wo-1', assignedToId: 'tech-2' })
    })
    expect(screen.getByText('เปลี่ยนผู้รับผิดชอบแล้ว')).toBeInTheDocument()
    expect(useTechniciansMock).toHaveBeenCalledWith('office-1', true)
  })

  it('allows explicit unassignment only while scheduled', async () => {
    expect(canUnassignWorkOrder(makeOrder({ status: 'SCHEDULED' }))).toBe(true)
    expect(canUnassignWorkOrder(makeOrder({ status: 'ACTIVE' }))).toBe(false)

    const user = userEvent.setup()
    render(<WorkOrderAssignmentCard order={makeOrder({ status: 'SCHEDULED' })} />)
    await user.click(screen.getByRole('button', { name: 'ยกเลิกการมอบหมาย' }))
    await user.click(screen.getByRole('button', { name: 'ยืนยัน' }))

    await waitFor(() => expect(unassignMutateAsync).toHaveBeenCalledWith({ id: 'wo-1' }))
    expect(screen.getByText('ยกเลิกการมอบหมายแล้ว')).toBeInTheDocument()
  })

  it('omits unassignment for active work while preserving reassignment', () => {
    render(<WorkOrderAssignmentCard order={makeOrder({ status: 'ACTIVE' })} />)

    expect(screen.queryByRole('button', { name: 'ยกเลิกการมอบหมาย' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' })).toBeInTheDocument()
  })
})
