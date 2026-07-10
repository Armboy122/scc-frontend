import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CreateDiscrepancyRequest,
  Discrepancy,
  DiscrepancyQueryParams,
  DiscrepancyType,
  ManualDiscrepancyType,
  ResolveDiscrepancyRequest,
} from '@/lib/types'

const KEYS = {
  all: ['discrepancies'] as const,
  lists: ['discrepancies', 'list'] as const,
  list: (params: DiscrepancyQueryParams) => [...KEYS.lists, params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

const MANUAL_TYPES = new Set<DiscrepancyType>([
  'UNEXPECTED_COVER',
  'MISSING_COVER',
  'OTHER',
])

function requireDiscrepancy(data: Discrepancy | null): Discrepancy {
  if (!data) throw new Error('Discrepancy API returned an empty response')
  return data
}

function normalizeRequiredText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${field} is required`)
  if ([...normalized].length > maxLength) throw new Error(`${field} is too long`)
  return normalized
}

function normalizeOptionalID(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!normalized) throw new Error(`${field} cannot be blank`)
  return normalized
}

function normalizeQuantity(value: number | undefined, field: string): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`)
  }
  return value
}

export function normalizeCreateDiscrepancyRequest(
  input: CreateDiscrepancyRequest,
): CreateDiscrepancyRequest {
  if (!MANUAL_TYPES.has(input.type)) {
    throw new Error('CAPACITY_SHORTFALL can only be created by the server')
  }
  const type = input.type as ManualDiscrepancyType
  const reason = normalizeRequiredText(input.reason, 'Discrepancy reason', 1000)
  const expectedQty = normalizeQuantity(input.expectedQty, 'expectedQty')
  const observedQty = normalizeQuantity(input.observedQty, 'observedQty')
  if (expectedQty !== undefined && observedQty !== undefined && expectedQty === observedQty) {
    throw new Error('expectedQty and observedQty must differ')
  }

  const payload: CreateDiscrepancyRequest = { type, reason }
  const officeId = normalizeOptionalID(input.officeId, 'officeId')
  const coverId = normalizeOptionalID(input.coverId, 'coverId')
  const workOrderId = normalizeOptionalID(input.workOrderId, 'workOrderId')
  const borrowId = normalizeOptionalID(input.borrowId, 'borrowId')
  if (officeId !== undefined) payload.officeId = officeId
  if (expectedQty !== undefined) payload.expectedQty = expectedQty
  if (observedQty !== undefined) payload.observedQty = observedQty
  if (coverId !== undefined) payload.coverId = coverId
  if (workOrderId !== undefined) payload.workOrderId = workOrderId
  if (borrowId !== undefined) payload.borrowId = borrowId
  return payload
}

function normalizeQuery(params: DiscrepancyQueryParams): DiscrepancyQueryParams {
  const normalized: DiscrepancyQueryParams = {}
  if (params.status !== undefined) normalized.status = params.status
  if (params.type !== undefined) normalized.type = params.type
  if (params.officeId?.trim()) normalized.officeId = params.officeId.trim()
  if (params.page !== undefined) normalized.page = params.page
  if (params.limit !== undefined) normalized.limit = params.limit
  return normalized
}

export function useDiscrepancies(params: DiscrepancyQueryParams = {}, enabled = true) {
  const normalizedParams = normalizeQuery(params)
  return useQuery({
    queryKey: KEYS.list(normalizedParams),
    queryFn: async () => {
      const response = await api.get<Discrepancy[]>(
        '/discrepancies',
        normalizedParams as Record<string, unknown>,
      )
      return response.data ?? []
    },
    enabled,
  })
}

export function useDiscrepancy(id: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const response = await api.get<Discrepancy>(`/discrepancies/${encodeURIComponent(id)}`)
      return requireDiscrepancy(response.data)
    },
    enabled: enabled && Boolean(id),
  })
}

export function useCreateDiscrepancy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateDiscrepancyRequest) => {
      const payload = normalizeCreateDiscrepancyRequest(input)
      const response = await api.post<Discrepancy>('/discrepancies', payload)
      return requireDiscrepancy(response.data)
    },
    onSuccess: (discrepancy) => {
      queryClient.setQueryData(KEYS.detail(discrepancy.id), discrepancy)
      void queryClient.invalidateQueries({ queryKey: KEYS.lists })
    },
  })
}

export function useResolveDiscrepancy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      resolutionNote,
    }: ResolveDiscrepancyRequest & { id: string }) => {
      const normalizedID = normalizeRequiredText(id, 'Discrepancy id', 200)
      const payload: ResolveDiscrepancyRequest = {
        resolutionNote: normalizeRequiredText(resolutionNote, 'Resolution note', 1000),
      }
      const response = await api.post<Discrepancy>(
        `/discrepancies/${encodeURIComponent(normalizedID)}/resolve`,
        payload,
      )
      return requireDiscrepancy(response.data)
    },
    onSuccess: (discrepancy) => {
      queryClient.setQueryData(KEYS.detail(discrepancy.id), discrepancy)
      queryClient.setQueriesData<Discrepancy[]>({ queryKey: KEYS.lists }, (current) => (
        current?.map((item) => item.id === discrepancy.id ? discrepancy : item)
      ))
      void queryClient.invalidateQueries({ queryKey: KEYS.lists })
    },
  })
}
