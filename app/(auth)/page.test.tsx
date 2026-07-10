import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkOrdersPage from './page'

const { useWorkOrdersMock } = vi.hoisted(() => ({
  useWorkOrdersMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'tech-1',
      name: 'Tech One',
      username: 'tech1',
      role: 'tech',
      officeId: 'office-1',
    },
  }),
}))

vi.mock('@/hooks/useWorkOrders', () => ({
  useWorkOrders: useWorkOrdersMock,
}))

describe('work order list API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkOrdersMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  it('uses the backend mine=true filter for technicians', () => {
    render(<WorkOrdersPage />)

    expect(useWorkOrdersMock).toHaveBeenCalledWith({ mine: true })
  })
})
