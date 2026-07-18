import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Discrepancy, Role } from '@/lib/types'
import DiscrepanciesPage from './page'

const { useAuthMock, useDiscrepanciesMock, useOfficesMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useDiscrepanciesMock: vi.fn(),
  useOfficesMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useDiscrepancies', () => ({ useDiscrepancies: useDiscrepanciesMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))

const discrepancy: Discrepancy = {
  id: 'discrepancy/1',
  office: { id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' },
  type: 'UNEXPECTED_COVER',
  status: 'OPEN',
  reason: 'พบฉนวนเกินจากรายการหน้างาน',
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
      office: role === 'admin' ? undefined : discrepancy.office,
    },
  })
}

describe('DiscrepanciesPage role-scoped queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRole('exec')
    useDiscrepanciesMock.mockReturnValue({
      data: [discrepancy],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    useOfficesMock.mockReturnValue({ data: [discrepancy.office] })
  })

  it.each<Role>(['exec', 'tech'])('shows %s an own-office list and report action', (role) => {
    setRole(role)
    render(<DiscrepanciesPage />)

    expect(screen.getByText('ข้อคลาดเคลื่อนของสำนักงานฉัน')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'รายงานสิ่งที่พบ' })).toHaveAttribute('href', '/discrepancies/new')
    expect(screen.getByRole('link', { name: /เปิดข้อคลาดเคลื่อน/ })).toHaveAttribute(
      'href',
      '/discrepancies/discrepancy%2F1',
    )
    expect(useDiscrepanciesMock).toHaveBeenCalledWith({}, true)
  })

  it('shows Admin an all-office open review queue and manual report action', () => {
    setRole('admin')
    render(<DiscrepanciesPage />)

    expect(screen.getByText('คิวตรวจสอบทุกสำนักงาน')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'รายงานสิ่งที่พบ' })).toHaveAttribute('href', '/discrepancies/new')
    expect(useDiscrepanciesMock).toHaveBeenCalledWith({ status: 'OPEN' }, true)
  })

  it('states explicitly that report and resolution never change stock', () => {
    render(<DiscrepanciesPage />)

    expect(screen.getByText(/การรายงานหรือปิดเรื่องนี้ไม่เปลี่ยนสต็อก/)).toBeInTheDocument()
  })

  it('resolves the office name from the directory when session has only officeId', () => {
    useAuthMock.mockReturnValue({ user: { id: 'tech-1', name: 'Tech', username: 'tech', role: 'tech', officeId: 'office-1' } })
    render(<DiscrepanciesPage />)

    expect(screen.getByText(/รายงานและติดตามข้อสังเกตของ สำนักงานหนึ่ง/)).toBeInTheDocument()
    expect(screen.queryByText(/office-1/)).not.toBeInTheDocument()
  })
})
