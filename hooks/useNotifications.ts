import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'

const KEYS = {
  all: ['notifications'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (unreadOnly: boolean) => [...KEYS.lists(), unreadOnly] as const,
  unreadCount: () => [...KEYS.all, 'unread-count'] as const,
}

interface MarkReadContext {
  previousLists: [QueryKey, Notification[] | undefined][]
  previousCount: number | undefined
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    staleTime: 15_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    queryKey: KEYS.list(unreadOnly),
    queryFn: async () => {
      const res = await api.get<Notification[]>('/notifications', {
        unread: unreadOnly ? true : undefined,
      })
      return res.data ?? []
    },
  })
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    staleTime: 15_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: enabled ? 60_000 : false,
    queryKey: KEYS.unreadCount(),
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count')
      return res.data?.count ?? 0
    },
    enabled,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<void>(`/notifications/${encodeURIComponent(id)}/read`),
    onMutate: async (id): Promise<MarkReadContext> => {
      await queryClient.cancelQueries({ queryKey: KEYS.all })

      const previousLists = queryClient.getQueriesData<Notification[]>({
        queryKey: KEYS.lists(),
      })
      const previousCount = queryClient.getQueryData<number>(KEYS.unreadCount())
      const readAt = new Date().toISOString()
      let wasUnread = false

      previousLists.forEach(([queryKey, notifications]) => {
        if (!notifications) return
        const target = notifications.find((notification) => notification.id === id)
        if (!target) return
        if (!target.readAt) wasUnread = true

        const unreadOnly = queryKey[2] === true
        queryClient.setQueryData<Notification[]>(
          queryKey,
          unreadOnly
            ? notifications.filter((notification) => notification.id !== id)
            : notifications.map((notification) =>
                notification.id === id
                  ? { ...notification, readAt: notification.readAt ?? readAt }
                  : notification,
              ),
        )
      })

      if (wasUnread && previousCount !== undefined) {
        queryClient.setQueryData(KEYS.unreadCount(), Math.max(0, previousCount - 1))
      }

      return { previousLists, previousCount }
    },
    onError: (_error, _id, context) => {
      context?.previousLists.forEach(([queryKey, notifications]) => {
        queryClient.setQueryData(queryKey, notifications)
      })
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(KEYS.unreadCount(), context.previousCount)
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.lists() }),
        queryClient.invalidateQueries({ queryKey: KEYS.unreadCount() }),
      ])
    },
  })
}
