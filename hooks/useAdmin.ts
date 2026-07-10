import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AdminUser,
  CreateUserRequest,
  Office,
  ReportSummary,
  RFIDScanResult,
  UpdateUserRequest,
  UsageMode,
  WorkHub,
} from '@/lib/types'

export interface AdminUserFilters {
  q?: string
  role?: string
  officeId?: string
  isActive?: boolean
}

const usersKey = (page: number, limit: number, filters: AdminUserFilters) => ['admin', 'users', page, limit, filters] as const

export function useAdminUsers(page: number, limit = 20, filters: AdminUserFilters = {}, enabled = true) {
  return useQuery({
    queryKey: usersKey(page, limit, filters),
    queryFn: () => api.get<AdminUser[]>('/users', { page, limit, ...filters }),
    enabled,
  })
}

export function useCreateAdminUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateUserRequest) => (await api.post<AdminUser>('/users', body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useUpdateAdminUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserRequest & { id: string }) =>
      (await api.patch<AdminUser>(`/users/${id}`, body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useResetAdminPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      (await api.post<{ message: string }>(`/users/${id}/reset-password`, { password })).data,
  })
}

export function useWorkHubs(enabled = true) {
  return useQuery({
    queryKey: ['workhubs'],
    queryFn: async () => (await api.get<WorkHub[]>('/workhubs')).data ?? [],
    enabled,
  })
}

export function useCreateWorkHub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string }) => (await api.post<WorkHub>('/workhubs', body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['workhubs'] }),
  })
}

export function useUpdateWorkHub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => (await api.patch<WorkHub>(`/workhubs/${id}`, { name })).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['workhubs'] }),
  })
}

export function useCreateOffice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; workHubId: string }) =>
      (await api.post<Office>('/offices', body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['offices'] }),
  })
}

export function useUpdateOffice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; workHubId?: string }) =>
      (await api.patch<Office>(`/offices/${id}`, body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['offices'] }),
  })
}

export function useReportSummary(officeId?: string, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'reports', 'summary', officeId],
    queryFn: async () => (await api.get<ReportSummary>('/reports/summary', { officeId })).data,
    enabled,
  })
}

export function useUsageModes(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'usage-modes'],
    queryFn: async () => (await api.get<UsageMode[]>('/usage-modes')).data ?? [],
    enabled,
  })
}

export function useRfidScan() {
  return useMutation({
    mutationFn: async (body: { officeId: string; tags: string[] }) =>
      (await api.post<RFIDScanResult>('/rfid/scan-batch', body)).data,
  })
}
