import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { OPERATIONAL_QUERY_KEYS } from '@/lib/queryPolicy'
import type { Borrow, BorrowAvailability, BorrowStatus } from '@/lib/types'
import {
  useBorrowAction,
  useBorrowAvailability,
  useBorrows,
  useCreateBorrow,
} from './useBorrows'

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

function makeBorrow(status: BorrowStatus = 'REQUESTED'): Borrow {
  return {
    id: 'borrow-1',
    status,
    borrowerOffice: { id: 'borrower-office', name: 'Borrower', workHubId: 'hub-1' },
    lenderOffice: { id: 'lender-office', name: 'Lender', workHubId: 'hub-2' },
    requestedQty: 2,
    covers: [{
      id: 'cover-1',
      assetCode: 'PEA-001',
      status: 'IN_STOCK',
      ownerOfficeId: 'lender-office',
      currentOfficeId: 'lender-office',
    }],
    returnDate: '2026-08-31T16:59:59Z',
    note: null,
    createdById: 'creator-1',
    approvedById: status === 'APPROVED' ? 'lender-exec' : null,
    activatedById: null,
    returnedById: null,
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
    activatedAt: null,
    returnedAt: null,
  }
}

describe('canonical borrow hooks', () => {
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

  it('passes only canonical list query params and returns the canonical DTO unchanged', async () => {
    const borrow = makeBorrow()
    vi.mocked(api.get).mockResolvedValue({ data: [borrow], error: null })

    const { result } = renderHook(() => useBorrows({
      direction: 'in',
      status: 'REQUESTED',
      page: 2,
      limit: 20,
    }), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([borrow]))
    expect(api.get).toHaveBeenCalledWith('/borrows', {
      direction: 'in',
      status: 'REQUESTED',
      page: 2,
      limit: 20,
    })
  })

  it('loads aggregate lender availability without requesting asset fields', async () => {
    const availability: BorrowAvailability[] = [{
      office: { id: 'lender-office', name: 'Lender', workHubId: 'hub-2' },
      ownedInStock: 20,
      reservedPlanned: 5,
      reservedBorrow: 3,
      borrowableCapacity: 12,
    }]
    vi.mocked(api.get).mockResolvedValue({ data: availability, error: null })

    const { result } = renderHook(() => useBorrowAvailability(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(availability))
    expect(api.get).toHaveBeenCalledWith('/borrows/availability')
  })

  it('keeps availability disabled for a role that cannot create', async () => {
    renderHook(() => useBorrowAvailability(false), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.get).not.toHaveBeenCalled()
  })

  it('creates with lender, quantity, RFC 3339 return time and optional note only', async () => {
    const borrow = makeBorrow()
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => queryClient.setQueryData(queryKey, { cached: true }))
    vi.mocked(api.post).mockResolvedValue({ data: borrow, error: null })
    const payload = {
      lenderOfficeId: 'lender-office',
      requestedQty: 2,
      returnDate: '2026-08-31T23:59:59+07:00',
      note: 'urgent',
    }

    const { result } = renderHook(() => useCreateBorrow(), { wrapper })
    await expect(result.current.mutateAsync(payload)).resolves.toEqual(borrow)

    expect(api.post).toHaveBeenCalledWith('/borrows', payload)
    expect(queryClient.getQueryData(['borrows', 'detail', 'borrow-1'])).toEqual(borrow)
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true)
    })
  })

  it('sends audited reasons and replaces detail/list caches with the returned DTO', async () => {
    const requested = makeBorrow('REQUESTED')
    const rejected = { ...makeBorrow('REJECTED'), updatedAt: '2026-07-10T09:00:00Z' }
    const listKey = ['borrows', 'list', { status: 'REQUESTED' }]
    queryClient.setQueryData(listKey, [requested])
    queryClient.setQueryData(['borrows', 'detail', requested.id], requested)
    vi.mocked(api.post).mockResolvedValue({ data: rejected, error: null })

    const { result } = renderHook(() => useBorrowAction('reject'), { wrapper })
    await expect(result.current.mutateAsync({
      id: requested.id,
      reason: '  audited support reason  ',
    })).resolves.toEqual(rejected)

    expect(api.post).toHaveBeenCalledWith('/borrows/borrow-1/reject', {
      reason: 'audited support reason',
    })
    expect(queryClient.getQueryData(['borrows', 'detail', 'borrow-1'])).toEqual(rejected)
    expect(queryClient.getQueryData(listKey)).toEqual([rejected])
  })

  it('rejects a business rejection without a nonblank reason before calling the API', async () => {
    const { result } = renderHook(() => useBorrowAction('reject'), { wrapper })

    await expect(result.current.mutateAsync({ id: 'borrow-1', reason: '   ' })).rejects.toThrow(
      'Borrow rejection reason is required',
    )
    expect(api.post).not.toHaveBeenCalled()
  })

  it('does not invent a transition when an action response is empty', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useBorrowAction('return'), { wrapper })

    await expect(result.current.mutateAsync({ id: 'borrow-1' })).rejects.toThrow(
      'Borrow API returned an empty response',
    )
    expect(api.post).toHaveBeenCalledWith('/borrows/borrow-1/return', undefined)
    expect(queryClient.getQueryData(['borrows', 'detail', 'borrow-1'])).toBeUndefined()
  })
})
