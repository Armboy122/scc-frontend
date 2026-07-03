import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CreateWorkOrderRequest,
  SubmitInstallRequest,
  SubmitRemoveRequest,
  WorkOrder,
  WorkOrderQueryParams,
} from '@/lib/types'

const KEYS = {
  all: ['workorders'] as const,
  list: (params?: WorkOrderQueryParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

type BackendWorkOrder = WorkOrder & {
  gpsLat?: number | null
  gpsLng?: number | null
  plannedQty?: number | null
  installDate?: string | null
  removalDate?: string | null
}

function normaliseWorkOrder(order: BackendWorkOrder): WorkOrder {
  const actualQty = order.actualQty ?? order.installations?.length
  const plannedQty = order.plannedQty ?? actualQty ?? 0

  return {
    ...order,
    installDate: order.installDate ?? undefined,
    removalDate: order.removalDate ?? undefined,
    plannedQty,
    actualQty,
    latitude: order.latitude ?? order.gpsLat ?? undefined,
    longitude: order.longitude ?? order.gpsLng ?? undefined,
    gpsLat: order.gpsLat ?? undefined,
    gpsLng: order.gpsLng ?? undefined,
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function useWorkOrders(params?: WorkOrderQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const res = await api.get<BackendWorkOrder[]>('/workorders', params as Record<string, unknown>)
      return (res.data ?? []).map(normaliseWorkOrder)
    },
  })
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<BackendWorkOrder>(`/workorders/${id}`)
      if (!res.data) throw new Error('Work order not found')
      return normaliseWorkOrder(res.data)
    },
    enabled: Boolean(id),
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkOrderRequest) =>
      api.post<WorkOrder>('/workorders', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Legacy start metadata (does not create an intermediate install status) ───

export function useStartWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkOrder>(`/workorders/${id}/start`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function useCancelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkOrder>(`/workorders/${id}/cancel`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Submit install scan ──────────────────────────────────────────────────────

export function useSubmitInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubmitInstallRequest }) => {
      for (const coverCode of payload.coverCodes) {
        await api.post(`/workorders/${id}/scan-install`, { coverCode })
      }
      return api.post<WorkOrder>(`/workorders/${id}/submit-install`, {
        gpsLat: payload.latitude,
        gpsLng: payload.longitude,
      })
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Start removal (ACTIVE/REMOVAL_DUE → REMOVING) ───────────────────────────

export function useStartRemoval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkOrder>(`/workorders/${id}/start-removal`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ─── Submit remove scan ───────────────────────────────────────────────────────

export function useSubmitRemove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubmitRemoveRequest }) => {
      for (const coverCode of payload.coverCodes) {
        await api.post(`/workorders/${id}/scan-remove`, { coverCode })
      }
      return api.post<WorkOrder>(`/workorders/${id}/complete-removal`, {
        gpsLat: payload.latitude,
        gpsLng: payload.longitude,
      })
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
