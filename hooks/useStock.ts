import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { OPERATIONAL_QUERY_FRESHNESS } from '@/lib/queryPolicy'
import type { StockSummary } from '@/lib/types'

const KEYS = {
  all: ['stock'] as const,
  summary: (officeId?: string, installDate?: string) => [...KEYS.all, 'summary', officeId, installDate] as const,
}

export function useStock(officeId?: string, installDate?: string) {
  return useQuery({
    ...OPERATIONAL_QUERY_FRESHNESS,
    queryKey: KEYS.summary(officeId, installDate),
    queryFn: async () => {
      const params = { officeId, installDate }
      const res = await api.get<StockSummary[]>('/stock', params)
      return res.data ?? []
    },
  })
}

export function useOfficeStock(officeId: string, installDate?: string) {
  return useQuery({
    ...OPERATIONAL_QUERY_FRESHNESS,
    queryKey: KEYS.summary(officeId, installDate),
    queryFn: async () => {
      const res = await api.get<StockSummary>(`/stock/${officeId}`, { installDate })
      return res.data ?? null
    },
    enabled: Boolean(officeId),
  })
}
