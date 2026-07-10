import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  invalidateOperationalQueries,
  OPERATIONAL_QUERY_FRESHNESS,
} from '@/lib/queryPolicy'
import type {
  Borrow,
  BorrowAvailability,
  BorrowQueryParams,
  CreateBorrowRequest,
} from '@/lib/types'
import type { BorrowAction } from '@/lib/borrowPresentation'

const KEYS = {
  all: ['borrows'] as const,
  lists: ['borrows', 'list'] as const,
  list: (params?: BorrowQueryParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  availability: ['borrows', 'availability'] as const,
}

function requireBorrow(data: Borrow | null): Borrow {
  if (!data) throw new Error('Borrow API returned an empty response')
  return data
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

export function useBorrowAvailability(enabled = true) {
  return useQuery({
    ...OPERATIONAL_QUERY_FRESHNESS,
    queryKey: KEYS.availability,
    queryFn: async () => {
      const res = await api.get<BorrowAvailability[]>('/borrows/availability')
      return res.data ?? []
    },
    enabled,
  })
}

export function useCreateBorrow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateBorrowRequest) => {
      const res = await api.post<Borrow>('/borrows', payload)
      return requireBorrow(res.data)
    },
    onSuccess: async (borrow) => {
      qc.setQueryData(KEYS.detail(borrow.id), borrow)
      await Promise.all([
        qc.invalidateQueries({ queryKey: KEYS.lists }),
        invalidateOperationalQueries(qc),
      ])
    },
  })
}

export interface BorrowActionVariables {
  id: string
  reason?: string
}

export function useBorrowAction(action: BorrowAction) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: BorrowActionVariables) => {
      const normalizedReason = reason?.trim()
      if (action === 'reject' && !normalizedReason) {
        throw new Error('Borrow rejection reason is required')
      }
      const res = await api.post<Borrow>(
        `/borrows/${id}/${action}`,
        normalizedReason ? { reason: normalizedReason } : undefined,
      )
      return requireBorrow(res.data)
    },
    onSuccess: async (borrow) => {
      qc.setQueryData(KEYS.detail(borrow.id), borrow)
      qc.setQueriesData<Borrow[]>({ queryKey: KEYS.lists }, (current) => (
        current?.map((item) => item.id === borrow.id ? borrow : item)
      ))
      await Promise.all([
        qc.invalidateQueries({ queryKey: KEYS.lists }),
        invalidateOperationalQueries(qc),
      ])
    },
  })
}
