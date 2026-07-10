import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { uploadEvidencePhoto } from '@/lib/evidenceUpload'
import { invalidateOperationalQueries } from '@/lib/queryPolicy'
import type {
  CompleteRemovalRequest,
  Cover,
  CreateWorkOrderRequest,
  SubmitInstallRequest,
  WorkOrder,
  WorkOrderQueryParams,
} from '@/lib/types'

const KEYS = {
  all: ['workorders'] as const,
  list: (params?: WorkOrderQueryParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  installDraftBase: (id: string) => [...KEYS.all, 'install-draft', id] as const,
  installDraft: (id: string, coverIds: string[]) =>
    [...KEYS.installDraftBase(id), coverIds] as const,
  removalProgressBase: (id: string) => [...KEYS.all, 'removal-progress', id] as const,
  removalProgress: (id: string, installationVersions: string[]) =>
    [...KEYS.removalProgressBase(id), installationVersions] as const,
}

export interface InstallDraftCover {
  coverId: string
  code: string
  scannedAt: string
}

export interface RemovalProgressCover {
  installationId: string
  coverId: string
  code: string
  installedAt?: string
  removedAt?: string
  usesCoverIdFallback: boolean
}

type BackendWorkOrder = WorkOrder & {
  gpsLat?: number | null
  gpsLng?: number | null
  plannedQty?: number | null
  installDate?: string | null
  removalDate?: string | null
  assignedToId?: string | null
  assignedTo?: string | null
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
    assignedToId: order.assignedToId ?? order.assignedTo ?? undefined,
  }
}

async function updateAssignmentCache(qc: QueryClient, id: string, order?: WorkOrder | null) {
  if (order) {
    qc.setQueryData(KEYS.detail(id), normaliseWorkOrder(order))
  }
  await Promise.all([
    qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
    qc.invalidateQueries({ queryKey: KEYS.all }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

async function updateWorkOrderCache(qc: QueryClient, id: string, order?: WorkOrder | null) {
  if (order) {
    qc.setQueryData(KEYS.detail(id), normaliseWorkOrder(order))
  }

  await Promise.all([
    qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
    qc.invalidateQueries({ queryKey: KEYS.all }),
    invalidateOperationalQueries(qc),
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
    if (
      normalizedMessage.includes('wrong office')
      || normalizedMessage.includes('belongs to another office')
    ) {
      return new ApiError(`เลข ${coverCode} ไม่ใช่ครอบฉนวนของหน่วยงานใบงานนี้`, err.code, err.status)
    }
    if (normalizedMessage.includes('not installed')) {
      return new ApiError(`เลข ${coverCode} ไม่อยู่ในสถานะติดตั้ง จึงถอดไม่ได้`, err.code, err.status)
    }
    if (normalizedMessage.includes('not all covers removed')) {
      return new ApiError('ยังถอดครอบฉนวนไม่ครบ จึงปิดงานไม่ได้', err.code, err.status)
    }
  }

  return new ApiError(`ตรวจสอบเลข ${coverCode} ไม่ผ่าน: ${err.message}`, err.code, err.status)
}

function toCompleteRemovalError(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err
  if (err.message.toLowerCase().includes('not all covers removed')) {
    return new ApiError('ยังถอดครอบฉนวนไม่ครบ ระบบจึงยังปิดใบงานไม่ได้', err.code, err.status)
  }
  if (err.code === 'STATE_INVALID') {
    return new ApiError('สถานะใบงานเปลี่ยนไปแล้ว กรุณาโหลดหน้านี้ใหม่ก่อนปิดงาน', err.code, err.status)
  }
  return err
}

function toRemovalScanError(err: unknown, coverCode: string): unknown {
  if (err instanceof ApiError && err.code === 'STATE_INVALID') {
    return new ApiError('ใบงานไม่ได้อยู่ในสถานะกำลังถอด กรุณาโหลดหน้านี้ใหม่', err.code, err.status)
  }
  return toCoverCodeError(err, coverCode)
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function useWorkOrders(params?: WorkOrderQueryParams) {
  return useQuery({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<BackendWorkOrder>(`/workorders/${id}`)
      if (!res.data) throw new Error('Work order not found')
      return normaliseWorkOrder(res.data)
    },
    enabled: Boolean(id),
  })
}

// ─── Resumable install draft ─────────────────────────────────────────────────

export function useInstallDraft(id: string, installations?: WorkOrder['installations']) {
  const draftInstallations = installations
    ?.filter((installation) => !installation.installedAt)
    .toSorted((a, b) =>
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id),
    )
  const coverIds = draftInstallations?.map((installation) => installation.coverId) ?? []

  return useQuery({
    queryKey: KEYS.installDraft(id, coverIds),
    queryFn: async (): Promise<InstallDraftCover[]> => Promise.all(
      (draftInstallations ?? []).map(async (installation) => {
        const res = await api.get<Cover>(`/covers/${installation.coverId}`)
        if (!res.data) throw new Error(`Cover ${installation.coverId} not found`)
        return {
          coverId: installation.coverId,
          code: res.data.assetCode,
          scannedAt: installation.createdAt ?? res.data.updatedAt,
        }
      }),
    ),
    enabled: Boolean(id) && installations !== undefined,
    placeholderData: (previousData) => previousData,
  })
}

export function useScanInstallDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, coverCode }: { id: string; coverCode: string }) => {
      try {
        const res = await api.post<Cover>(`/workorders/${id}/scan-install`, { coverCode })
        if (!res.data) throw new Error('Scan succeeded without a cover response')
        return res.data
      } catch (err) {
        throw toCoverCodeError(err, coverCode)
      }
    },
    onSuccess: async (_cover, { id }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
        qc.invalidateQueries({ queryKey: KEYS.installDraftBase(id) }),
        invalidateOperationalQueries(qc),
      ])
    },
  })
}

export function useUnscanInstallDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, coverId }: { id: string; coverId: string }) =>
      api.delete(`/workorders/${id}/scan-install/${encodeURIComponent(coverId)}`),
    onSuccess: async (_res, { id }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
        qc.invalidateQueries({ queryKey: KEYS.installDraftBase(id) }),
        invalidateOperationalQueries(qc),
      ])
    },
  })
}

// ─── Resumable removal progress ──────────────────────────────────────────────

export function useRemovalProgress(id: string, installations?: WorkOrder['installations']) {
  const serverInstallations = installations?.toSorted((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )
  const installationVersions = serverInstallations?.map((installation) =>
    `${installation.id}:${installation.coverId}:${installation.removedAt ?? 'open'}`,
  ) ?? []

  return useQuery({
    queryKey: KEYS.removalProgress(id, installationVersions),
    queryFn: async (): Promise<RemovalProgressCover[]> => Promise.all(
      (serverInstallations ?? []).map(async (installation) => {
        try {
          const res = await api.get<Cover>(`/covers/${installation.coverId}`)
          if (res.data) {
            return {
              installationId: installation.id,
              coverId: installation.coverId,
              code: res.data.assetCode,
              installedAt: installation.installedAt,
              removedAt: installation.removedAt,
              usesCoverIdFallback: false,
            }
          }
        } catch {
          // Removal truth lives on the installation. A cover-detail lookup is
          // presentation-only, so keep the workflow resumable with its stable ID.
        }

        return {
          installationId: installation.id,
          coverId: installation.coverId,
          code: installation.coverId,
          installedAt: installation.installedAt,
          removedAt: installation.removedAt,
          usesCoverIdFallback: true,
        }
      }),
    ),
    enabled: Boolean(id) && installations !== undefined,
    placeholderData: (previousData) => previousData,
  })
}

export function useScanRemove() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, coverCode }: { id: string; coverCode: string }) => {
      try {
        const res = await api.post<Cover>(`/workorders/${id}/scan-remove`, { coverCode })
        if (!res.data) throw new Error('Removal scan succeeded without a cover response')
        return res.data
      } catch (err) {
        throw toRemovalScanError(err, coverCode)
      }
    },
    onSuccess: async (_cover, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.detail(id) }),
        queryClient.invalidateQueries({ queryKey: KEYS.removalProgressBase(id) }),
        invalidateOperationalQueries(queryClient),
      ])
    },
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkOrderRequest) =>
      api.post<WorkOrder>('/workorders', payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: KEYS.all }),
        invalidateOperationalQueries(qc),
      ])
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

// ─── Assignment (Admin/Exec; backend re-validates role, office and target) ───

export function useAssignWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      api.post<void>(`/workorders/${id}/assign`, { assignedToId }),
    onSuccess: async (_response, { id }) => updateAssignmentCache(qc, id),
  })
}

export function useUnassignWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    // The canonical nullable assignment field is accepted by UpdateScheduled;
    // callers expose this only for SCHEDULED work orders.
    mutationFn: ({ id }: { id: string }) =>
      api.patch<WorkOrder>(`/workorders/${id}`, { assignedToId: null }),
    onSuccess: async (response, { id }) => updateAssignmentCache(qc, id, response.data),
  })
}

// ─── Submit install scan ──────────────────────────────────────────────────────

export function useSubmitInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubmitInstallRequest }) => {
      const coverIds = Array.from(new Set(payload.coverIds.filter(Boolean)))
      if (coverIds.length === 0) {
        throw new Error('ไม่พบรายการฉนวนที่สแกนแล้ว')
      }
      if (payload.photoFile) {
        await uploadEvidencePhoto({
          kind: 'install',
          workOrderId: id,
          coverIds,
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

// ─── Upload removal evidence and complete ────────────────────────────────────

export function useCompleteRemoval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CompleteRemovalRequest }) => {
      if (payload.installations.length === 0) {
        throw new ApiError('ไม่พบรายการครอบฉนวนของใบงาน', 'STATE_INVALID', 409)
      }

      const allRemoved = payload.installations.every((installation) => Boolean(installation.removedAt))
      if (!allRemoved) {
        throw new ApiError('ยังถอดครอบฉนวนไม่ครบ ระบบจึงยังปิดใบงานไม่ได้', 'STATE_INVALID', 409)
      }

      const removedCoverIds = Array.from(new Set(
        payload.installations.map((installation) => installation.coverId),
      ))
      await uploadEvidencePhoto({
        kind: 'remove',
        workOrderId: id,
        coverIds: removedCoverIds,
        file: payload.photoFile,
      })

      try {
        return await api.post<WorkOrder>(`/workorders/${id}/complete-removal`)
      } catch (err) {
        throw toCompleteRemovalError(err)
      }
    },
    onSuccess: (res, { id }) => updateWorkOrderCache(queryClient, id, res.data),
  })
}
