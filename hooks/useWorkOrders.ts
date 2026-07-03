import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { uploadEvidencePhoto } from '@/lib/evidenceUpload'
import type {
  Cover,
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

async function updateWorkOrderCache(qc: QueryClient, id: string, order?: WorkOrder | null) {
  if (order) {
    qc.setQueryData(KEYS.detail(id), normaliseWorkOrder(order))
  }

  await Promise.all([
    qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
    qc.invalidateQueries({ queryKey: KEYS.all }),
  ])
}

function toCoverCodeError(err: unknown, coverCode: string): unknown {
  if (!(err instanceof ApiError)) return err

  const normalizedMessage = err.message.toLowerCase()
  if (err.code === 'CONFLICT' || err.code === 'STATE_INVALID') {
    if (normalizedMessage.includes('cover not found')) {
      return new ApiError(`เลข ${coverCode} ไม่ถูกต้อง ไม่พบ QR/รหัสครอบฉนวนนี้`, err.code, err.status)
    }
    if (normalizedMessage.includes('cover not in this work order')) {
      return new ApiError(`เลข ${coverCode} ไม่อยู่ในใบงานนี้ กรุณาตรวจสอบอีกครั้ง`, err.code, err.status)
    }
    if (normalizedMessage.includes('not in stock')) {
      return new ApiError(`เลข ${coverCode} ไม่พร้อมติดตั้งในสต็อก`, err.code, err.status)
    }
    if (normalizedMessage.includes('wrong office')) {
      return new ApiError(`เลข ${coverCode} ไม่ใช่ครอบฉนวนของหน่วยงานใบงานนี้`, err.code, err.status)
    }
    if (normalizedMessage.includes('not all covers removed')) {
      return new ApiError('ยังถอดครอบฉนวนไม่ครบ จึงปิดงานไม่ได้', err.code, err.status)
    }
  }

  return new ApiError(`ตรวจสอบเลข ${coverCode} ไม่ผ่าน: ${err.message}`, err.code, err.status)
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
    onSuccess: (res, id) => updateWorkOrderCache(qc, id, res.data),
  })
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function useCancelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkOrder>(`/workorders/${id}/cancel`),
    onSuccess: (res, id) => updateWorkOrderCache(qc, id, res.data),
  })
}

// ─── Submit install scan ──────────────────────────────────────────────────────

export function useSubmitInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubmitInstallRequest }) => {
      const scannedCovers: Cover[] = []
      for (const coverCode of payload.coverCodes) {
        try {
          const res = await api.post<Cover>(`/workorders/${id}/scan-install`, { coverCode })
          if (res.data) scannedCovers.push(res.data)
        } catch (err) {
          throw toCoverCodeError(err, coverCode)
        }
      }
      if (payload.photoFile) {
        await uploadEvidencePhoto({
          kind: 'install',
          workOrderId: id,
          coverIds: scannedCovers.map((cover) => cover.id),
          file: payload.photoFile,
        })
      }
      return api.post<WorkOrder>(`/workorders/${id}/submit-install`)
    },
    onSuccess: (res, { id }) => updateWorkOrderCache(qc, id, res.data),
  })
}

// ─── Start removal (ACTIVE/REMOVAL_DUE → REMOVING) ───────────────────────────

export function useStartRemoval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkOrder>(`/workorders/${id}/start-removal`),
    onSuccess: (res, id) => updateWorkOrderCache(qc, id, res.data),
  })
}

// ─── Submit remove scan ───────────────────────────────────────────────────────

export function useSubmitRemove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubmitRemoveRequest }) => {
      const removedCovers: Cover[] = []
      for (const coverCode of payload.coverCodes) {
        try {
          const res = await api.post<Cover>(`/workorders/${id}/scan-remove`, { coverCode })
          if (res.data) removedCovers.push(res.data)
        } catch (err) {
          throw toCoverCodeError(err, coverCode)
        }
      }
      if (payload.photoFile) {
        await uploadEvidencePhoto({
          kind: 'remove',
          workOrderId: id,
          coverIds: removedCovers.map((cover) => cover.id),
          file: payload.photoFile,
        })
      }
      return api.post<WorkOrder>(`/workorders/${id}/complete-removal`)
    },
    onSuccess: (res, { id }) => updateWorkOrderCache(qc, id, res.data),
  })
}
