import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StockSummary } from '@/lib/types'

const KEYS = {
  all: ['stock'] as const,
  summary: (officeId?: string) => [...KEYS.all, 'summary', officeId] as const,
}

export function useStock(officeId?: string) {
  return useQuery({
    queryKey: KEYS.summary(officeId),
    queryFn: async () => {
      const params = officeId ? { officeId } : undefined
      const res = await api.get<StockSummary[]>('/stock', params)
      return res.data ?? []
    },
  })
}

export function useOfficeStock(officeId: string) {
  return useQuery({
    queryKey: KEYS.summary(officeId),
    queryFn: async () => {
      const res = await api.get<StockSummary>(`/stock/${officeId}`)
      return res.data ?? null
    },
    enabled: Boolean(officeId),
  })
}
