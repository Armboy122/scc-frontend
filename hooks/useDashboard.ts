import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { OPERATIONAL_QUERY_FRESHNESS } from '@/lib/queryPolicy'
import type { DashboardSummary } from '@/lib/types'

const DASHBOARD_SUMMARY_KEY = ['dashboard', 'summary'] as const

export function useDashboardSummary(enabled = true) {
  return useQuery({
    ...OPERATIONAL_QUERY_FRESHNESS,
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary')
      if (!res.data) throw new Error('Dashboard summary is empty')
      return res.data
    },
    enabled,
  })
}
