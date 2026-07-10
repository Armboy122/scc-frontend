import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TechnicianOption } from '@/lib/types'

const KEYS = {
  all: ['technicians'] as const,
  list: (officeId: string) => [...KEYS.all, 'list', officeId] as const,
}

export function useTechnicians(officeId: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.list(officeId),
    queryFn: async () => {
      const response = await api.get<TechnicianOption[]>('/technicians', { officeId })
      return response.data ?? []
    },
    enabled: enabled && Boolean(officeId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
