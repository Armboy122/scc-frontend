import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { useTechnicians } from './useTechnicians'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

describe('useTechnicians', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('loads only the backend-scoped technician projection for the work-order office', async () => {
    const technicians = [{ id: 'tech-1', name: 'ช่างหนึ่ง', officeId: 'office-1' }]
    vi.mocked(api.get).mockResolvedValue({ data: technicians, error: null })

    const { result } = renderHook(() => useTechnicians('office-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(technicians))
    expect(api.get).toHaveBeenCalledWith('/technicians', { officeId: 'office-1' })
  })

  it('does not request technicians for a role/state where assignment is disabled', async () => {
    renderHook(() => useTechnicians('office-1', false), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.get).not.toHaveBeenCalled()
  })
})
