import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { ApiError } from './api'

/**
 * Inventory is derived from covers, planned work-order reservations and borrow
 * reservations. A successful mutation in any one of those domains therefore
 * invalidates every operational projection that can show the same stock.
 */
export const OPERATIONAL_QUERY_KEYS = [
  ['covers'],
  ['stock'],
  ['dashboard'],
  ['borrows', 'availability'],
] as const satisfies readonly QueryKey[]

export const OPERATIONAL_QUERY_FRESHNESS = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always',
} as const

/**
 * Retry one transient query failure. HTTP 4xx responses are authoritative
 * client/auth/rate-limit outcomes and must be surfaced immediately instead of
 * replayed (especially 401 and 429). Mutations have retries disabled entirely.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (error instanceof ApiError) return error.status >= 500
  return true
}

export async function invalidateOperationalQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    OPERATIONAL_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}
