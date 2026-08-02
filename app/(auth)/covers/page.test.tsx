import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cover } from '@/lib/types'
import CoversPage from './page'

const useAllCoversMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'tech-1', role: 'tech', officeId: 'office-62' } }),
}))

vi.mock('@/hooks/useCovers', () => ({
  useAllCovers: (...args: unknown[]) => useAllCoversMock(...args),
}))

vi.mock('@/hooks/useOffices', () => ({
  useOffices: () => ({ data: [{ id: 'office-62', name: 'กฟส.หาดใหญ่', workHubId: 'hub-1' }] }),
}))

function makeCover(index: number): Cover {
  return {
    id: `cover-${index}`,
    assetCode: `PEA${String(index).padStart(10, '0')}`,
    qrCode: `SCC:office-62:PEA${String(index).padStart(10, '0')}`,
    status: 'IN_STOCK',
    ownerOfficeId: 'office-62',
    currentOfficeId: 'office-62',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('covers page', () => {
  beforeEach(() => {
    useAllCoversMock.mockReturnValue({
      data: Array.from({ length: 24 }, (_, index) => makeCover(index + 1)),
      isLoading: false,
      error: null,
    })
  })

  it('renders every cover returned across API pages', () => {
    render(<CoversPage />)

    expect(screen.getAllByText('PEA0000000024')).toHaveLength(2)
    expect(screen.getByText('แสดง 24 รายการ')).toBeInTheDocument()
    expect(useAllCoversMock).toHaveBeenCalledWith({
      status: undefined,
      q: undefined,
      officeId: undefined,
    })
  })
})
