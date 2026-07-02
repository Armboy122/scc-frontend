import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Borrow, BorrowQueryParams, CreateBorrowRequest } from '@/lib/types'

const KEYS = {
  all: ['borrows'] as const,
  list: (params?: BorrowQueryParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useBorrows(params?: BorrowQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const res = await api.get<Borrow[]>('/borrows', params as Record<string, unknown>)
      return res.data ?? []
    },
  })
}

export function useBorrow(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<Borrow>(`/borrows/${id}`)
      if (!res.data) throw new Error('Borrow request not found')
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateBorrow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBorrowRequest) => api.post<Borrow>('/borrows', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useBorrowAction(action: 'approve' | 'reject' | 'cancel' | 'activate' | 'return') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Borrow>(`/borrows/${id}/${action}`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
