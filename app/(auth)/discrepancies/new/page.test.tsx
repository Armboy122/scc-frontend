import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Discrepancy, Role } from '@/lib/types'
import NewDiscrepancyPage from './page'

const {
  backMock,
  replaceMock,
  mutateAsyncMock,
  useAuthMock,
  useCreateDiscrepancyMock,
  useOfficesMock,
} = vi.hoisted(() => ({
  backMock: vi.fn(),
  replaceMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  useAuthMock: vi.fn(),
  useCreateDiscrepancyMock: vi.fn(),
  useOfficesMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock, replace: replaceMock }),
}))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useDiscrepancies', () => ({ useCreateDiscrepancy: useCreateDiscrepancyMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))

const created: Discrepancy = {
  id: 'discrepancy-created',
  office: { id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' },
  type: 'UNEXPECTED_COVER',
  status: 'OPEN',
  reason: 'พบฉนวนเกิน',
  expectedQty: 4,
  observedQty: 5,
  coverId: null,
  workOrderId: 'wo-1',
  borrowId: null,
  reportedById: 'tech-1',
  resolvedById: null,
  resolutionNote: null,
  createdAt: '2026-07-10T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
  resolvedAt: null,
}

function setRole(role: Role) {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
      name: role,
      username: role,
      role,
      officeId: role === 'admin' ? undefined : 'office-1',
      office: role === 'admin' ? undefined : created.office,
    },
  })
}

describe('NewDiscrepancyPage canonical manual report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRole('tech')
    mutateAsyncMock.mockResolvedValue(created)
    useCreateDiscrepancyMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      error: null,
    })
    useOfficesMock.mockReturnValue({
      data: [
        created.office,
        { id: 'office-2', name: 'สำนักงานสอง', workHubId: 'hub-2' },
      ],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it.each<Role>(['exec', 'tech'])(
    'submits %s report from session office without office or server-owned fields',
    async (role) => {
      setRole(role)
      const user = userEvent.setup()
      render(<NewDiscrepancyPage />)

      await user.type(screen.getByLabelText(/เหตุผลและรายละเอียด/), '  พบฉนวนเกิน  ')
      await user.type(screen.getByLabelText(/จำนวนที่คาด/), '4')
      await user.type(screen.getByLabelText(/จำนวนที่พบ/), '5')
      await user.type(screen.getByLabelText(/Work order ID/), '  wo-1  ')
      await user.click(screen.getByRole('button', { name: 'ส่งรายงานเพื่อตรวจสอบ' }))

      await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({
        type: 'UNEXPECTED_COVER',
        reason: 'พบฉนวนเกิน',
        expectedQty: 4,
        observedQty: 5,
        workOrderId: 'wo-1',
      }))
      const payload = mutateAsyncMock.mock.calls[0][0]
      expect(payload).not.toHaveProperty('officeId')
      expect(payload).not.toHaveProperty('status')
      expect(payload).not.toHaveProperty('reportedById')
      expect(replaceMock).toHaveBeenCalledWith('/discrepancies/discrepancy-created')
      expect(useOfficesMock).toHaveBeenCalledWith(false)
    },
  )

  it('blocks equal quantities before calling the API', async () => {
    const user = userEvent.setup()
    render(<NewDiscrepancyPage />)

    await user.type(screen.getByLabelText(/เหตุผลและรายละเอียด/), 'ตรวจนับ')
    await user.type(screen.getByLabelText(/จำนวนที่คาด/), '2')
    await user.type(screen.getByLabelText(/จำนวนที่พบ/), '2')
    await user.click(screen.getByRole('button', { name: 'ส่งรายงานเพื่อตรวจสอบ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ต้องไม่เท่ากัน')
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  it('requires Admin to select an office and sends canonical officeId', async () => {
    setRole('admin')
    const user = userEvent.setup()
    render(<NewDiscrepancyPage />)

    expect(screen.getByLabelText(/สำนักงานที่ต้องการรายงาน/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ส่งรายงานเพื่อตรวจสอบ' })).toBeInTheDocument()
    expect(useOfficesMock).toHaveBeenCalledWith(true)

    await user.type(screen.getByLabelText(/เหตุผลและรายละเอียด/), '  ตรวจพบฉนวนผิดรายการ  ')
    await user.click(screen.getByRole('button', { name: 'ส่งรายงานเพื่อตรวจสอบ' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาเลือกสำนักงาน')
    expect(mutateAsyncMock).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText(/สำนักงานที่ต้องการรายงาน/), 'office-2')
    await user.click(screen.getByRole('button', { name: 'ส่งรายงานเพื่อตรวจสอบ' }))
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({
      officeId: 'office-2',
      type: 'UNEXPECTED_COVER',
      reason: 'ตรวจพบฉนวนผิดรายการ',
    }))
  })
})
