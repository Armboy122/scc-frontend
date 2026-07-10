import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Discrepancy, Role } from '@/lib/types'
import { DiscrepancyDetailContent } from './DiscrepancyDetailContent'

const { backMock, mutateAsyncMock, useAuthMock, useDiscrepancyMock, useResolveDiscrepancyMock } = vi.hoisted(() => ({
  backMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  useAuthMock: vi.fn(),
  useDiscrepancyMock: vi.fn(),
  useResolveDiscrepancyMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: backMock }) }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useDiscrepancies', () => ({
  useDiscrepancy: useDiscrepancyMock,
  useResolveDiscrepancy: useResolveDiscrepancyMock,
}))

const discrepancy: Discrepancy = {
  id: 'discrepancy-1',
  office: { id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' },
  type: 'UNEXPECTED_COVER',
  status: 'OPEN',
  reason: 'พบฉนวนเกินจากรายการหน้างาน',
  expectedQty: 4,
  observedQty: 5,
  coverId: 'cover-1',
  workOrderId: 'wo-1',
  borrowId: 'borrow-1',
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
      id: `${role}-1`, name: role, username: role, role,
      officeId: role === 'admin' ? undefined : 'office-1',
    },
  })
}

describe('Discrepancy detail and resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRole('admin')
    useDiscrepancyMock.mockReturnValue({
      data: discrepancy,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    mutateAsyncMock.mockResolvedValue({ ...discrepancy, status: 'RESOLVED' })
    useResolveDiscrepancyMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      error: null,
    })
  })

  it('requires Admin resolution note and submits the canonical resolve body', async () => {
    const user = userEvent.setup()
    render(<DiscrepancyDetailContent id="discrepancy-1" />)

    await user.click(screen.getByRole('button', { name: 'ยืนยันปิดเรื่อง' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาระบุวิธีตรวจสอบ')
    expect(mutateAsyncMock).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/บันทึกการแก้ไข/), '  ตรวจนับและคืนเข้ากระบวนการปกติแล้ว  ')
    await user.click(screen.getByRole('button', { name: 'ยืนยันปิดเรื่อง' }))
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'discrepancy-1',
      resolutionNote: 'ตรวจนับและคืนเข้ากระบวนการปกติแล้ว',
    })
  })

  it.each<Role>(['exec', 'tech'])('keeps %s read-only and preserves stock warning', (role) => {
    setRole(role)
    render(<DiscrepancyDetailContent id="discrepancy-1" />)

    expect(screen.queryByRole('button', { name: 'ยืนยันปิดเรื่อง' })).not.toBeInTheDocument()
    expect(screen.getByText(/รอผู้ดูแลระบบตรวจสอบ/)).toBeInTheDocument()
    expect(screen.getByText(/การรายงานหรือปิดเรื่องนี้ไม่เปลี่ยนสต็อก/)).toBeInTheDocument()
  })
})
