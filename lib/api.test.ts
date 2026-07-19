import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { clearAllTokens, getAccessToken, setAccessToken } from './tokenStore'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
})

describe('API authentication transport', () => {
  beforeEach(() => { clearAllTokens(); vi.clearAllMocks() })
  afterEach(() => { clearAllTokens(); vi.unstubAllGlobals() })

  it('sends cookies and the CSRF header without reading a refresh token', async () => {
    document.cookie = 'scc_csrf=test-csrf; path=/'
    const fetchMock = vi.fn().mockResolvedValue(json({ data: {}, error: null }))
    vi.stubGlobal('fetch', fetchMock)
    await api.post('/auth/logout')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({
      credentials: 'include', headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' }),
    }))
  })

  it('refreshes with the httpOnly cookie and retries a protected request', async () => {
    setAccessToken('old-access')
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith('/auth/refresh')) return Promise.resolve(json({ data: { accessToken: 'new-access' }, error: null }))
      const authorization = (init?.headers as Record<string, string>).Authorization
      return Promise.resolve(authorization === 'Bearer new-access'
        ? json({ data: { ok: true }, error: null })
        : json({ data: null, error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(api.get('/protected')).resolves.toMatchObject({ data: { ok: true } })
    expect(getAccessToken()).toBe('new-access')
    expect(fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/refresh'))?.[1]).toEqual(expect.objectContaining({
      credentials: 'include',
    }))
  })
})
