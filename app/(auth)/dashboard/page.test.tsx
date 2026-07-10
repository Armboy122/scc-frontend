import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardSummary, Role } from '@/lib/types'
import DashboardPage from './page'

const { replaceMock, useAuthMock, useDashboardSummaryMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
  useDashboardSummaryMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('@/hooks/useDashboard', () => ({
  useDashboardSummary: useDashboardSummaryMock,
}))

const populatedSummary: DashboardSummary = {
  stockByOffice: [
    {
      office: { id: 'office-1', name: 'Office One', workHubId: 'hub-1' },
      stock: {
        officeId: 'office-1',
        inStock: 120,
        reservedPlanned: 10,
        reservedBorrow: 4,
        availableForWorkOrder: 106,
        installed: 30,
        onLoanOut: 0,
        onLoanIn: 0,
        total: 150,
      },
    },
  ],
  workOrdersByStatus: {
    SCHEDULED: 57,
    ACTIVE: 21,
    REMOVAL_DUE: 5,
    REMOVING: 3,
    COMPLETED: 101,
    CANCELLED: 9,
  },
  dueSoon: [],
  overdueRemovals: [],
}

function setRole(role: Role) {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
      name: role,
      username: role,
      role,
      officeId: role === 'admin' ? undefined : 'office-1',
    },
  })
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRole('exec')
    useDashboardSummaryMock.mockReturnValue({
      data: populatedSummary,
      isLoading: false,
      error: null,
    })
  })

  it('renders canonical totals greater than the work-order page limit', () => {
    render(<DashboardPage />)

    const scheduledLabel = screen.getByText('รอติดตั้ง')
    expect(within(scheduledLabel.parentElement!).getByText('57')).toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(useDashboardSummaryMock).toHaveBeenCalledWith(true)
  })

  it('renders an explicit loading state', () => {
    useDashboardSummaryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<DashboardPage />)

    expect(screen.getByLabelText('กำลังโหลดแดชบอร์ด')).toBeInTheDocument()
  })

  it('shows API errors and a true empty state', () => {
    useDashboardSummaryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    })
    const { rerender } = render(<DashboardPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้')

    useDashboardSummaryMock.mockReturnValue({
      data: {
        stockByOffice: [],
        workOrdersByStatus: {
          SCHEDULED: 0,
          ACTIVE: 0,
          REMOVAL_DUE: 0,
          REMOVING: 0,
          COMPLETED: 0,
          CANCELLED: 0,
        },
        dueSoon: [],
        overdueRemovals: [],
      },
      isLoading: false,
      error: null,
    })
    rerender(<DashboardPage />)

    expect(screen.getByText('ยังไม่มีข้อมูลสำหรับสรุป')).toBeInTheDocument()
  })

  it('redirects technicians and keeps the protected query disabled', async () => {
    setRole('tech')
    render(<DashboardPage />)

    expect(useDashboardSummaryMock).toHaveBeenCalledWith(false)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
  })
})
