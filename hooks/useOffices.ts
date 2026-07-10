import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Office } from '@/lib/types'

const OFFICES_KEY = ['offices', 'list'] as const

export function useOffices(enabled = true) {
  return useQuery({
    queryKey: OFFICES_KEY,
    queryFn: async () => {
      const response = await api.get<Office[]>('/offices')
      return response.data ?? []
    },
    enabled,
  })
}
