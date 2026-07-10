import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { CreateDiscrepancyRequest, Discrepancy, DiscrepancyQueryParams } from '@/lib/types'
import {
  useCreateDiscrepancy,
  useDiscrepancies,
  useResolveDiscrepancy,
} from './useDiscrepancies'

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

function makeDiscrepancy(overrides: Partial<Discrepancy> = {}): Discrepancy {
  return {
    id: 'discrepancy-1',
    office: { id: 'office-1', name: 'Office One', workHubId: 'hub-1' },
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
    ...overrides,
  }
}

describe('canonical discrepancy hooks', () => {
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

  it('sends only canonical list filters and trims office scope', async () => {
    const discrepancy = makeDiscrepancy()
    vi.mocked(api.get).mockResolvedValue({ data: [discrepancy], error: null })
    const params = {
      status: 'OPEN',
      type: 'CAPACITY_SHORTFALL',
      officeId: ' office-1 ',
      page: 2,
      limit: 20,
      injected: 'must-not-leak',
    } as DiscrepancyQueryParams

    const { result } = renderHook(() => useDiscrepancies(params), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([discrepancy]))
    expect(api.get).toHaveBeenCalledWith('/discrepancies', {
      status: 'OPEN',
      type: 'CAPACITY_SHORTFALL',
      officeId: 'office-1',
      page: 2,
      limit: 20,
    })
  })

  it('creates a manual report with a strict canonical payload only', async () => {
    const discrepancy = makeDiscrepancy()
    vi.mocked(api.post).mockResolvedValue({ data: discrepancy, error: null })
    const input = {
      type: 'UNEXPECTED_COVER',
      reason: '  พบฉนวนเกินจากรายการหน้างาน  ',
      officeId: ' office-2 ',
      expectedQty: 4,
      observedQty: 5,
      workOrderId: ' wo-1 ',
      status: 'RESOLVED',
      reportedById: 'spoofed-user',
      resolutionNote: 'must-not-leak',
    } as CreateDiscrepancyRequest

    const { result } = renderHook(() => useCreateDiscrepancy(), { wrapper })
    await expect(result.current.mutateAsync(input)).resolves.toEqual(discrepancy)

    expect(api.post).toHaveBeenCalledWith('/discrepancies', {
      type: 'UNEXPECTED_COVER',
      reason: 'พบฉนวนเกินจากรายการหน้างาน',
      officeId: 'office-2',
      expectedQty: 4,
      observedQty: 5,
      workOrderId: 'wo-1',
    })
    expect(queryClient.getQueryData(['discrepancies', 'detail', 'discrepancy-1'])).toEqual(discrepancy)
  })

  it('rejects server-only type and invalid quantities before calling the API', async () => {
    const { result } = renderHook(() => useCreateDiscrepancy(), { wrapper })

    await expect(result.current.mutateAsync({
      type: 'CAPACITY_SHORTFALL',
      reason: 'shortfall',
    } as unknown as CreateDiscrepancyRequest)).rejects.toThrow('only be created by the server')
    await expect(result.current.mutateAsync({
      type: 'OTHER',
      reason: 'counts match',
      expectedQty: 2,
      observedQty: 2,
    })).rejects.toThrow('must differ')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('requires a trimmed resolution note and sends no other mutation fields', async () => {
    const resolved = makeDiscrepancy({
      status: 'RESOLVED',
      resolvedById: 'admin-1',
      resolutionNote: 'ตรวจนับแล้ว',
      resolvedAt: '2026-07-10T09:00:00Z',
    })
    vi.mocked(api.post).mockResolvedValue({ data: resolved, error: null })
    const { result } = renderHook(() => useResolveDiscrepancy(), { wrapper })

    await expect(result.current.mutateAsync({ id: 'discrepancy/1', resolutionNote: '   ' })).rejects.toThrow(
      'Resolution note is required',
    )
    expect(api.post).not.toHaveBeenCalled()

    await expect(result.current.mutateAsync({
      id: 'discrepancy/1',
      resolutionNote: '  ตรวจนับแล้ว  ',
      status: 'OPEN',
    } as Parameters<typeof result.current.mutateAsync>[0])).resolves.toEqual(resolved)
    expect(api.post).toHaveBeenCalledWith('/discrepancies/discrepancy%2F1/resolve', {
      resolutionNote: 'ตรวจนับแล้ว',
    })
  })
})
