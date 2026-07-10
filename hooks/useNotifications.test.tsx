import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from './useNotifications'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const unreadNotification: Notification = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'WORKORDER_ASSIGNED',
  message: 'Assigned work order',
  workOrderId: 'wo-1',
  createdAt: '2026-07-10T00:00:00Z',
}

const readNotification: Notification = {
  ...unreadNotification,
  id: 'notification-2',
  readAt: '2026-07-10T01:00:00Z',
}

describe('notification hooks', () => {
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

  it('loads the exact notification list and unread-only query contract', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [unreadNotification], error: null })

    const { result } = renderHook(() => useNotifications(true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([unreadNotification]))
    expect(api.get).toHaveBeenCalledWith('/notifications', { unread: true })
  })

  it('loads the canonical unread count endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { count: 42 }, error: null })

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper })

    await waitFor(() => expect(result.current.data).toBe(42))
    expect(api.get).toHaveBeenCalledWith('/notifications/unread-count')
  })

  it('optimistically marks a notification read, removes it from unread-only data, and decrements the badge', async () => {
    let resolveRequest!: () => void
    vi.mocked(api.post).mockImplementation(() => new Promise((resolve) => {
      resolveRequest = () => resolve({ data: null, error: null })
    }))
    queryClient.setQueryData(
      ['notifications', 'list', false],
      [unreadNotification, readNotification],
    )
    queryClient.setQueryData(['notifications', 'list', true], [unreadNotification])
    queryClient.setQueryData(['notifications', 'unread-count'], 1)

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper })
    act(() => { result.current.mutate('notification-1') })

    await waitFor(() => {
      const all = queryClient.getQueryData<Notification[]>(['notifications', 'list', false])
      expect(all?.[0].readAt).toEqual(expect.any(String))
      expect(queryClient.getQueryData(['notifications', 'list', true])).toEqual([])
      expect(queryClient.getQueryData(['notifications', 'unread-count'])).toBe(0)
    })
    expect(api.post).toHaveBeenCalledWith('/notifications/notification-1/read')

    act(() => { resolveRequest() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('restores read state and count when mark-read fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network failed'))
    queryClient.setQueryData(['notifications', 'list', false], [unreadNotification])
    queryClient.setQueryData(['notifications', 'unread-count'], 1)

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper })
    act(() => { result.current.mutate('notification-1') })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(['notifications', 'list', false])).toEqual([unreadNotification])
    expect(queryClient.getQueryData(['notifications', 'unread-count'])).toBe(1)
  })
})
