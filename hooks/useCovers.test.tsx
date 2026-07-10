import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { OPERATIONAL_QUERY_KEYS } from '@/lib/queryPolicy'
import type { Cover } from '@/lib/types'
import { useCovers, useRetireCover } from './useCovers'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const cover: Cover = {
  id: 'cover-1',
  assetCode: 'PEA-001',
  qrCode: 'SCC:office-1:PEA-001',
  status: 'IN_STOCK',
  ownerOfficeId: 'office-1',
  currentOfficeId: 'office-1',
  createdAt: '2026-07-04T00:00:00Z',
  updatedAt: '2026-07-04T00:00:00Z',
}

describe('cover API contracts', () => {
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

  it('sends server-side cover search with the q parameter', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [cover], error: null })

    const { result } = renderHook(() => useCovers({ q: 'PEA-001', status: 'IN_STOCK' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.data).toEqual([cover]))
    expect(api.get).toHaveBeenCalledWith('/covers', {
      q: 'PEA-001',
      status: 'IN_STOCK',
    })
  })

  it('uses POST for the retire endpoint', async () => {
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => queryClient.setQueryData(queryKey, { cached: true }))
    vi.mocked(api.post).mockResolvedValue({
      data: { ...cover, status: 'RETIRED' },
      error: null,
    })

    const { result } = renderHook(() => useRetireCover(), { wrapper })
    await result.current.mutateAsync({ id: 'cover-1', reason: 'ชำรุด' })

    expect(api.post).toHaveBeenCalledWith('/covers/cover-1/retire', { reason: 'ชำรุด' })
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true)
    })
  })
})
