import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { Office } from '@/lib/types'
import { useOffices } from './useOffices'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: { get: vi.fn() },
  }
})

describe('useOffices', () => {
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

  it('loads the canonical office list for an Admin selector', async () => {
    const offices: Office[] = [
      { id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' },
      { id: 'office-2', name: 'สำนักงานสอง', workHubId: 'hub-2' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: offices, error: null })

    const { result } = renderHook(() => useOffices(true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(offices))
    expect(api.get).toHaveBeenCalledWith('/offices')
  })

  it('does not fetch offices when the actor uses their own office', async () => {
    renderHook(() => useOffices(false), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.get).not.toHaveBeenCalled()
  })
})
