import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { DashboardSummary } from '@/lib/types'
import { useDashboardSummary } from './useDashboard'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

const summary: DashboardSummary = {
  stockByOffice: [],
  workOrdersByStatus: {
    SCHEDULED: 57,
    ACTIVE: 12,
    REMOVAL_DUE: 3,
    REMOVING: 2,
    COMPLETED: 80,
    CANCELLED: 4,
  },
  dueSoon: [],
  overdueRemovals: [],
}

describe('useDashboardSummary', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('loads canonical totals from dashboard summary instead of a paginated work-order list', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: summary, error: null })

    const { result } = renderHook(() => useDashboardSummary(), { wrapper })

    await waitFor(() => expect(result.current.data?.workOrdersByStatus.SCHEDULED).toBe(57))
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/dashboard/summary')
  })

  it('does not call the protected endpoint when access is disabled', () => {
    renderHook(() => useDashboardSummary(false), { wrapper })

    expect(api.get).not.toHaveBeenCalled()
  })
})
