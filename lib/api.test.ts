import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('treats 204 No Content as a successful empty API response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await api.post('/workorders/wo-1/scan-remove', { coverCode: 'COVER-001' })

    expect(res).toEqual({ data: null, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/workorders/wo-1/scan-remove'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
