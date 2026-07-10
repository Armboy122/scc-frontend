import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/lib/api'
import { uploadEvidencePhoto } from '@/lib/evidenceUpload'
import { OPERATIONAL_QUERY_KEYS } from '@/lib/queryPolicy'
import type { Cover, WorkOrder } from '@/lib/types'
import {
  useCompleteRemoval,
  useAssignWorkOrder,
  useInstallDraft,
  useWorkOrder,
  useRemovalProgress,
  useScanInstallDraft,
  useScanRemove,
  useSubmitInstall,
  useUnassignWorkOrder,
  useUnscanInstallDraft,
} from './useWorkOrders'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

vi.mock('@/lib/evidenceUpload', () => ({
  uploadEvidencePhoto: vi.fn(),
}))

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    status: 'SCHEDULED',
    customerName: 'PEA Customer',
    plannedQty: 1,
    officeId: 'office-1',
    createdAt: '2026-07-04T00:00:00Z',
    updatedAt: '2026-07-04T00:00:00Z',
    ...overrides,
  }
}

describe('work-order assignment hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('assigns by canonical technician id and invalidates detail, lists and dashboard', async () => {
    queryClient.setQueryData(['workorders', 'detail', 'wo-1'], makeWorkOrder())
    queryClient.setQueryData(['workorders', 'list'], [makeWorkOrder()])
    queryClient.setQueryData(['dashboard', 'summary'], { cached: true })
    vi.mocked(api.post).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useAssignWorkOrder(), { wrapper })
    await result.current.mutateAsync({ id: 'wo-1', assignedToId: 'tech-2' })

    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/assign', {
      assignedToId: 'tech-2',
    })
    expect(queryClient.getQueryState(['workorders', 'detail', 'wo-1'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['workorders', 'list'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['dashboard', 'summary'])?.isInvalidated).toBe(true)
  })

  it('keeps the backend assignedToId field on canonical work-order detail', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: makeWorkOrder({ assignedToId: 'tech-1' }),
      error: null,
    })

    const { result } = renderHook(() => useWorkOrder('wo-1'), { wrapper })

    await waitFor(() => expect(result.current.data?.assignedToId).toBe('tech-1'))
    expect(api.get).toHaveBeenCalledWith('/workorders/wo-1')
  })

  it('unassigns through the nullable scheduled-update contract and stores server truth', async () => {
    const assigned = makeWorkOrder({ assignedToId: 'tech-1' })
    const unassigned = makeWorkOrder({ assignedToId: undefined })
    queryClient.setQueryData(['workorders', 'detail', 'wo-1'], assigned)
    vi.mocked(api.patch).mockResolvedValue({ data: unassigned, error: null })

    const { result } = renderHook(() => useUnassignWorkOrder(), { wrapper })
    await result.current.mutateAsync({ id: 'wo-1' })

    expect(api.patch).toHaveBeenCalledWith('/workorders/wo-1', { assignedToId: null })
    expect(queryClient.getQueryData<WorkOrder>(['workorders', 'detail', 'wo-1'])?.assignedToId).toBeUndefined()
  })
})

describe('useSubmitInstall', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('stores returned ACTIVE work order in detail cache immediately after successful submit', async () => {
    const scheduledOrder = makeWorkOrder()
    const activeOrder = makeWorkOrder({
      status: 'ACTIVE',
      actualQty: 1,
      installations: [
        {
          id: 'inst-1',
          workOrderId: 'wo-1',
          coverId: 'cover-1',
          createdAt: '2026-07-04T00:00:30Z',
          installedAt: '2026-07-04T00:01:00Z',
        },
      ],
      updatedAt: '2026-07-04T00:01:00Z',
    })
    queryClient.setQueryData(['workorders', 'detail', 'wo-1'], scheduledOrder)

    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path.endsWith('/submit-install')) {
        return { data: activeOrder, error: null }
      }
      throw new Error(`Unexpected POST ${path}`)
    })

    const { result } = renderHook(() => useSubmitInstall(), { wrapper })

    await result.current.mutateAsync({
      id: 'wo-1',
      payload: { coverIds: ['cover-1'] },
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<WorkOrder>(['workorders', 'detail', 'wo-1'])?.status).toBe('ACTIVE')
    })
    expect(api.post).not.toHaveBeenCalledWith(
      '/workorders/wo-1/scan-install',
      expect.anything(),
    )
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/submit-install')
  })

  it('requires at least one already-persisted draft cover', async () => {
    const { result } = renderHook(() => useSubmitInstall(), { wrapper })

    await expect(
      result.current.mutateAsync({ id: 'wo-1', payload: { coverIds: [] } }),
    ).rejects.toThrow('ไม่พบรายการฉนวนที่สแกนแล้ว')
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe('resumable install draft', () => {
  let queryClient: QueryClient

  const cover: Cover = {
    id: 'cover-1',
    assetCode: 'COVER-001',
    qrCode: 'SCC:office-1:COVER-001',
    status: 'IN_STOCK',
    ownerOfficeId: 'office-1',
    currentOfficeId: 'office-1',
    createdAt: '2026-07-04T00:00:00Z',
    updatedAt: '2026-07-04T00:00:00Z',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('hydrates a persisted draft using cover IDs returned on the work order', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: cover, error: null })

    const { result } = renderHook(() => useInstallDraft('wo-1', [{
      id: 'inst-1',
      workOrderId: 'wo-1',
      coverId: 'cover-1',
      createdAt: '2026-07-04T00:01:00Z',
    }]), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([{
      coverId: 'cover-1',
      code: 'COVER-001',
      scannedAt: '2026-07-04T00:01:00Z',
    }]))
    expect(api.get).toHaveBeenCalledWith('/covers/cover-1')
  })

  it('persists each scan immediately and maps backend conflict errors to the scanned code', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: cover, error: null })
      .mockRejectedValueOnce(new ApiError('cover not found: cover scan conflict', 'CONFLICT', 409))

    const { result } = renderHook(() => useScanInstallDraft(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'COVER-001',
    })).resolves.toEqual(cover)
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/scan-install', {
      coverCode: 'COVER-001',
    })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'BAD-QR',
    })).rejects.toThrow('เลข BAD-QR ไม่ถูกต้อง ไม่พบ QR/รหัสครอบฉนวนนี้')
  })

  it('deletes the persisted draft when a scan is removed', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useUnscanInstallDraft(), { wrapper })

    await result.current.mutateAsync({ id: 'wo-1', coverId: 'cover-1' })
    expect(api.delete).toHaveBeenCalledWith('/workorders/wo-1/scan-install/cover-1')
  })
})

describe('server-truthful removal', () => {
  let queryClient: QueryClient

  const installedCover: Cover = {
    id: 'cover-1',
    assetCode: 'COVER-001',
    qrCode: 'SCC:office-1:COVER-001',
    status: 'INSTALLED',
    ownerOfficeId: 'office-1',
    currentOfficeId: 'office-1',
    createdAt: '2026-07-04T00:00:00Z',
    updatedAt: '2026-07-04T00:00:00Z',
  }

  const removedInstallation = {
    id: 'inst-1',
    workOrderId: 'wo-1',
    coverId: 'cover-1',
    createdAt: '2026-07-04T00:00:00Z',
    installedAt: '2026-07-04T00:01:00Z',
    removedAt: '2026-07-10T00:01:00Z',
  }

  const openInstallation = {
    id: 'inst-2',
    workOrderId: 'wo-1',
    coverId: 'cover-2',
    createdAt: '2026-07-04T00:00:01Z',
    installedAt: '2026-07-04T00:02:00Z',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('hydrates removed progress from server installations after refresh', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ...installedCover, status: 'IN_STOCK' },
      error: null,
    })

    const { result } = renderHook(() => useRemovalProgress('wo-1', [
      removedInstallation,
    ]), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([{
      installationId: 'inst-1',
      coverId: 'cover-1',
      code: 'COVER-001',
      installedAt: '2026-07-04T00:01:00Z',
      removedAt: '2026-07-10T00:01:00Z',
      usesCoverIdFallback: false,
    }]))
    expect(api.get).toHaveBeenCalledWith('/covers/cover-1')
  })

  it('falls back to a stable cover ID when its presentation lookup fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('cover lookup unavailable'))

    const { result } = renderHook(() => useRemovalProgress('wo-1', [
      removedInstallation,
    ]), { wrapper })

    await waitFor(() => expect(result.current.data?.[0]).toMatchObject({
      coverId: 'cover-1',
      code: 'cover-1',
      usesCoverIdFallback: true,
      removedAt: '2026-07-10T00:01:00Z',
    }))
  })

  it('persists every removal scan immediately and keeps an already-removed retry idempotent', async () => {
    const removedCover = { ...installedCover, status: 'IN_STOCK' as const }
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => queryClient.setQueryData(queryKey, { cached: true }))
    vi.mocked(api.post).mockResolvedValue({ data: removedCover, error: null })

    const { result } = renderHook(() => useScanRemove(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'COVER-001',
    })).resolves.toEqual(removedCover)
    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'COVER-001',
    })).resolves.toEqual(removedCover)

    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post).toHaveBeenNthCalledWith(1, '/workorders/wo-1/scan-remove', {
      coverCode: 'COVER-001',
    })
    expect(api.post).toHaveBeenNthCalledWith(2, '/workorders/wo-1/scan-remove', {
      coverCode: 'COVER-001',
    })
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true)
    })
  })

  it('surfaces a partial scan failure clearly and allows a direct retry', async () => {
    vi.mocked(api.post)
      .mockRejectedValueOnce(new ApiError('cover not in this work order: cover scan conflict', 'CONFLICT', 409))
      .mockResolvedValueOnce({ data: { ...installedCover, status: 'IN_STOCK' }, error: null })

    const { result } = renderHook(() => useScanRemove(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'WRONG-QR',
    })).rejects.toThrow('เลข WRONG-QR ไม่อยู่ในใบงานนี้ กรุณาตรวจสอบอีกครั้ง')

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'COVER-001',
    })).resolves.toMatchObject({ id: 'cover-1', status: 'IN_STOCK' })
    expect(api.post).toHaveBeenCalledTimes(2)
  })

  it('maps a direct scan against the wrong work-order state clearly', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError('invalid work order state', 'STATE_INVALID', 409),
    )
    const { result } = renderHook(() => useScanRemove(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      coverCode: 'COVER-001',
    })).rejects.toThrow('ใบงานไม่ได้อยู่ในสถานะกำลังถอด')
  })

  it('blocks partial close before upload or completion', async () => {
    const photo = new File(['photo'], 'remove.jpg', { type: 'image/jpeg' })
    const { result } = renderHook(() => useCompleteRemoval(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      payload: {
        installations: [removedInstallation, openInstallation],
        photoFile: photo,
      },
    })).rejects.toThrow('ยังถอดครอบฉนวนไม่ครบ')
    expect(uploadEvidencePhoto).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('keeps removal resumable when upload fails and retries without rescanning', async () => {
    const photo = new File(['photo'], 'remove.jpg', { type: 'image/jpeg' })
    const completedOrder = makeWorkOrder({ status: 'COMPLETED', actualQty: 1 })
    vi.mocked(uploadEvidencePhoto)
      .mockRejectedValueOnce(new Error('อัปโหลดรูปไม่สำเร็จ'))
      .mockResolvedValueOnce('https://storage.example/remove.jpg')
    vi.mocked(api.post).mockResolvedValue({ data: completedOrder, error: null })

    const { result } = renderHook(() => useCompleteRemoval(), { wrapper })
    const variables = {
      id: 'wo-1',
      payload: {
        installations: [removedInstallation],
        photoFile: photo,
      },
    }

    await expect(result.current.mutateAsync(variables)).rejects.toThrow('อัปโหลดรูปไม่สำเร็จ')
    expect(api.post).not.toHaveBeenCalled()

    await expect(result.current.mutateAsync(variables)).resolves.toMatchObject({
      data: { status: 'COMPLETED' },
    })
    expect(uploadEvidencePhoto).toHaveBeenCalledTimes(2)
    expect(uploadEvidencePhoto).toHaveBeenLastCalledWith({
      kind: 'remove',
      workOrderId: 'wo-1',
      coverIds: ['cover-1'],
      file: photo,
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/complete-removal')
    expect(api.post).not.toHaveBeenCalledWith(
      '/workorders/wo-1/scan-remove',
      expect.anything(),
    )
  })

  it('uploads evidence for every server-removed cover before completing', async () => {
    const secondRemovedInstallation = {
      ...openInstallation,
      removedAt: '2026-07-10T00:02:00Z',
    }
    const photo = new File(['photo'], 'remove.jpg', { type: 'image/jpeg' })
    const completedOrder = makeWorkOrder({ status: 'COMPLETED', actualQty: 2 })
    vi.mocked(uploadEvidencePhoto).mockResolvedValue('https://storage.example/remove.jpg')
    vi.mocked(api.post).mockResolvedValue({ data: completedOrder, error: null })

    const { result } = renderHook(() => useCompleteRemoval(), { wrapper })
    await result.current.mutateAsync({
      id: 'wo-1',
      payload: {
        installations: [removedInstallation, secondRemovedInstallation],
        photoFile: photo,
      },
    })

    expect(uploadEvidencePhoto).toHaveBeenCalledWith({
      kind: 'remove',
      workOrderId: 'wo-1',
      coverIds: ['cover-1', 'cover-2'],
      file: photo,
    })
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/complete-removal')
  })

  it('maps a direct backend partial-close error clearly', async () => {
    const photo = new File(['photo'], 'remove.jpg', { type: 'image/jpeg' })
    vi.mocked(uploadEvidencePhoto).mockResolvedValue('https://storage.example/remove.jpg')
    vi.mocked(api.post).mockRejectedValue(
      new ApiError('not all covers removed: state invalid', 'STATE_INVALID', 409),
    )

    const { result } = renderHook(() => useCompleteRemoval(), { wrapper })

    await expect(result.current.mutateAsync({
      id: 'wo-1',
      payload: {
        installations: [removedInstallation],
        photoFile: photo,
      },
    })).rejects.toThrow('ยังถอดครอบฉนวนไม่ครบ ระบบจึงยังปิดใบงานไม่ได้')
  })
})
