import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cover, CoverQueryParams, RegisterCoverRequest } from '@/lib/types'

const KEYS = {
  all: ['covers'] as const,
  list: (params?: CoverQueryParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function useCovers(params?: CoverQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const res = await api.get<Cover[]>('/covers', params as Record<string, unknown>)
      return res.data ?? []
    },
  })
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useCover(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<Cover>(`/covers/${id}`)
      if (!res.data) throw new Error('Cover not found')
      return res.data
    },
    enabled: Boolean(id),
  })
}

// ─── Register single ──────────────────────────────────────────────────────────

export function useRegisterCover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegisterCoverRequest) =>
      api.post<Cover>('/covers', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Batch register ───────────────────────────────────────────────────────────

export function useBatchRegisterCovers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { ownerOfficeId: string; items: RegisterCoverRequest[] }) =>
      api.post<Cover[]>('/covers/batch', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Retire ───────────────────────────────────────────────────────────────────

export function useRetireCover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<Cover>(`/covers/${id}/retire`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
