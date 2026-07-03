import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { WorkOrder } from '@/lib/types'
import { useSubmitInstall } from './useWorkOrders'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    status: 'SCHEDULED',
    customerName: 'PEA Customer',
    plannedQty: 1,
    officeId: 'office-1',
    createdAt: '2026-07-04T00:00:00Z',
    updatedAt: '2026-07-04T00:00:00Z',
    ...overrides,
  }
}

describe('useSubmitInstall', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('stores returned ACTIVE work order in detail cache immediately after successful submit', async () => {
    const scheduledOrder = makeWorkOrder()
    const activeOrder = makeWorkOrder({
      status: 'ACTIVE',
      actualQty: 1,
      installations: [
        {
          id: 'inst-1',
          workOrderId: 'wo-1',
          coverId: 'cover-1',
          installedAt: '2026-07-04T00:01:00Z',
        },
      ],
      updatedAt: '2026-07-04T00:01:00Z',
    })
    queryClient.setQueryData(['workorders', 'detail', 'wo-1'], scheduledOrder)

    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path.endsWith('/scan-install')) {
        return { data: null, error: null }
      }
      if (path.endsWith('/submit-install')) {
        return { data: activeOrder, error: null }
      }
      throw new Error(`Unexpected POST ${path}`)
    })

    const { result } = renderHook(() => useSubmitInstall(), { wrapper })

    await result.current.mutateAsync({
      id: 'wo-1',
      payload: { coverCodes: ['COVER-001'] },
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<WorkOrder>(['workorders', 'detail', 'wo-1'])?.status).toBe('ACTIVE')
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/scan-install', { coverCode: 'COVER-001' })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/submit-install')
  })
})
