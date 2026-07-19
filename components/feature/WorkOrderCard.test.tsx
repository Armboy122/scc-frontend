import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WorkOrder } from '@/lib/types'

const { useAuthMock, useStartRemovalMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useStartRemovalMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useWorkOrders', () => ({ useStartRemoval: useStartRemovalMock }))

import { WorkOrderCard } from './WorkOrderCard'

const order: WorkOrder = {
  id: 'wo-1',
  status: 'SCHEDULED',
  customerName: 'โรงเรียนตัวอย่าง',
  plannedQty: 3,
  officeId: 'office-1',
  createdAt: '2026-07-10T00:00:00Z',
  updatedAt: '2026-07-10T00:00:00Z',
}

describe('WorkOrderCard', () => {
  it('exposes the work-order detail as a keyboard-focusable link', () => {
    useAuthMock.mockReturnValue({ user: undefined })
    useStartRemovalMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })

    render(<WorkOrderCard order={order} />)

    const detailLink = screen.getByRole('link', { name: 'เปิดรายละเอียดใบงาน โรงเรียนตัวอย่าง' })
    expect(detailLink).toHaveAttribute('href', '/workorders/wo-1')
  })
})
