import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/lib/api'
import type { WorkOrder } from '@/lib/types'
import { useSubmitInstall, useSubmitRemove } from './useWorkOrders'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  }
})

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

  it('surfaces an invalid manual code with the entered number', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('cover not found: cover scan conflict', 'CONFLICT', 409))

    const { result } = renderHook(() => useSubmitInstall(), { wrapper })

    await expect(
      result.current.mutateAsync({
        id: 'wo-1',
        payload: { coverCodes: ['BAD-QR'] },
      }),
    ).rejects.toThrow('เลข BAD-QR ไม่ถูกต้อง ไม่พบ QR/รหัสครอบฉนวนนี้')
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/scan-install', { coverCode: 'BAD-QR' })
  })
})

describe('useSubmitRemove', () => {
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

  it('closes removal without sending GPS capture payload', async () => {
    const completedOrder = makeWorkOrder({ status: 'COMPLETED', actualQty: 1 })
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path.endsWith('/scan-remove')) {
        return { data: null, error: null }
      }
      if (path.endsWith('/complete-removal')) {
        return { data: completedOrder, error: null }
      }
      throw new Error(`Unexpected POST ${path}`)
    })

    const { result } = renderHook(() => useSubmitRemove(), { wrapper })

    await result.current.mutateAsync({
      id: 'wo-1',
      payload: { coverCodes: ['COVER-001'] },
    })

    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/scan-remove', { coverCode: 'COVER-001' })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/complete-removal')
    expect(api.post).not.toHaveBeenCalledWith(
      '/workorders/wo-1/complete-removal',
      expect.objectContaining({ gpsLat: expect.anything() }),
    )
  })

  it('surfaces a wrong manual removal code with the entered number', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('cover not in this work order: cover scan conflict', 'CONFLICT', 409))

    const { result } = renderHook(() => useSubmitRemove(), { wrapper })

    await expect(
      result.current.mutateAsync({
        id: 'wo-1',
        payload: { coverCodes: ['WRONG-QR'] },
      }),
    ).rejects.toThrow('เลข WRONG-QR ไม่อยู่ในใบงานนี้ กรุณาตรวจสอบอีกครั้ง')
  })
})
