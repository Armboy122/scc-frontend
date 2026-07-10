import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import {
  invalidateOperationalQueries,
  OPERATIONAL_QUERY_FRESHNESS,
  OPERATIONAL_QUERY_KEYS,
  shouldRetryQuery,
} from './queryPolicy'

describe('query policy', () => {
  it.each([400, 401, 403, 404, 409, 422, 429])(
    'does not retry deterministic HTTP %i responses',
    (status) => {
      expect(shouldRetryQuery(0, new ApiError('request failed', 'FAILED', status))).toBe(false)
    },
  )

  it('retries one network or server failure and then stops', () => {
    expect(shouldRetryQuery(0, new TypeError('network unavailable'))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError('unavailable', 'INTERNAL', 503))).toBe(true)
    expect(shouldRetryQuery(1, new TypeError('network unavailable'))).toBe(false)
    expect(shouldRetryQuery(1, new ApiError('unavailable', 'INTERNAL', 503))).toBe(false)
  })

  it('keeps operational reads fresh on navigation, focus and reconnect', () => {
    expect(OPERATIONAL_QUERY_FRESHNESS).toEqual({
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    })
  })

  it('invalidates every projection of shared inventory capacity', async () => {
    const queryClient = new QueryClient()
    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => queryClient.setQueryData(queryKey, { cached: true }))

    await invalidateOperationalQueries(queryClient)

    OPERATIONAL_QUERY_KEYS.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true)
    })
  })
})
