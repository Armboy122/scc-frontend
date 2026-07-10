import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api'
import {
  clearAllTokens,
  getAccessToken,
  getRefreshToken,
  replaceSessionTokens,
  setAccessToken,
  setRefreshToken,
} from './tokenStore'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api client', () => {
  beforeEach(() => {
    clearAllTokens()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearAllTokens()
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

  it('preserves Retry-After guidance from a rate-limited response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: null,
      error: { code: 'RATE_LIMITED', message: 'try again later' },
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '37',
      },
    })))

    await expect(api.post('/auth/login', { username: 'admin', password: 'wrong' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAfterSeconds: 37,
    })
  })

  it('shares one refresh, rotates both tokens, and retries every concurrent 401', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveRefresh!: (response: Response) => void
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) return refreshResponse

      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization
      if (authorization === 'Bearer new-access') {
        return Promise.resolve(jsonResponse({ data: { path: url }, error: null }))
      }
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = api.get<{ path: string }>('/first')
    const second = api.get<{ path: string }>('/second')

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
    })
    resolveRefresh(jsonResponse({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      error: null,
    }))

    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(firstResult.data?.path).toContain('/first')
    expect(secondResult.data?.path).toContain('/second')
    expect(getAccessToken()).toBe('new-access')
    expect(getRefreshToken()).toBe('new-refresh')
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('rejects every queued request and clears tokens when the shared refresh fails', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveRefresh!: (response: Response) => void
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith('/auth/refresh')) return refreshResponse
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const settled = Promise.allSettled([
      api.get('/first'),
      api.get('/second'),
    ])

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
    })
    resolveRefresh(jsonResponse({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'invalid refresh' },
    }, 401))

    const results = await settled

    expect(results).toHaveLength(2)
    results.forEach((result) => {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(ApiError)
        expect((result.reason as ApiError).code).toBe('UNAUTHORIZED')
      }
    })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('does not publish a rotated access token without its matching refresh token', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          data: { accessToken: 'orphan-access' },
          error: null,
        }))
      }
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/protected')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('lets a newer explicit login win over an in-flight automatic refresh', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveRefresh!: (response: Response) => void
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    const logoutListener = vi.fn()
    window.addEventListener('auth:logout', logoutListener)
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) return refreshResponse

      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = api.get('/protected')
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/refresh'))).toBe(true)
    })

    replaceSessionTokens('login-access', 'login-refresh')
    resolveRefresh(jsonResponse({
      data: { accessToken: 'stale-access', refreshToken: 'stale-refresh' },
      error: null,
    }))

    await expect(request).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(getAccessToken()).toBe('login-access')
    expect(getRefreshToken()).toBe('login-refresh')
    expect(logoutListener).not.toHaveBeenCalled()
    window.removeEventListener('auth:logout', logoutListener)
  })

  it('does not resurrect credentials when logout wins over an in-flight refresh', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveRefresh!: (response: Response) => void
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    const logoutListener = vi.fn()
    window.addEventListener('auth:logout', logoutListener)
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith('/auth/refresh')) return refreshResponse
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = api.get('/protected')
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/refresh'))).toBe(true)
    })

    clearAllTokens()
    resolveRefresh(jsonResponse({
      data: { accessToken: 'stale-access', refreshToken: 'stale-refresh' },
      error: null,
    }))

    await expect(request).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(logoutListener).not.toHaveBeenCalled()
    window.removeEventListener('auth:logout', logoutListener)
  })

  it('scopes refresh single-flight ownership to the exact session token', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveOldRefresh!: (response: Response) => void
    let resolveNewRefresh!: (response: Response) => void
    const oldRefreshResponse = new Promise<Response>((resolve) => {
      resolveOldRefresh = resolve
    })
    const newRefreshResponse = new Promise<Response>((resolve) => {
      resolveNewRefresh = resolve
    })
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        const body = JSON.parse(String(init?.body)) as { refreshToken: string }
        return body.refreshToken === 'old-refresh' ? oldRefreshResponse : newRefreshResponse
      }

      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization
      if (authorization === 'Bearer refreshed-login-access') {
        return Promise.resolve(jsonResponse({ data: { path: url }, error: null }))
      }
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const oldRequest = api.get('/old-session-request')
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
    })

    replaceSessionTokens('login-access', 'login-refresh')
    const newRequest = api.get<{ path: string }>('/new-session-request')
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(2)
    })

    resolveNewRefresh(jsonResponse({
      data: {
        accessToken: 'refreshed-login-access',
        refreshToken: 'refreshed-login-refresh',
      },
      error: null,
    }))
    await expect(newRequest).resolves.toMatchObject({
      data: { path: expect.stringContaining('/new-session-request') },
    })

    resolveOldRefresh(jsonResponse({
      data: { accessToken: 'stale-access', refreshToken: 'stale-refresh' },
      error: null,
    }))
    await expect(oldRequest).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(getAccessToken()).toBe('refreshed-login-access')
    expect(getRefreshToken()).toBe('refreshed-login-refresh')
  })

  it('does not replay a delayed old-session response after a new login', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveProtected!: (response: Response) => void
    const protectedResponse = new Promise<Response>((resolve) => {
      resolveProtected = resolve
    })
    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith('/protected')) return protectedResponse
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = api.post('/protected', { oldUserMutation: true })
    replaceSessionTokens('login-access', 'login-refresh')
    resolveProtected(jsonResponse({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'expired' },
    }, 401))

    await expect(request).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/refresh'))).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('login-access')
    expect(getRefreshToken()).toBe('login-refresh')
  })

  it('discards a successful protected response from an older session', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')

    let resolveProtected!: (response: Response) => void
    const protectedResponse = new Promise<Response>((resolve) => {
      resolveProtected = resolve
    })
    const fetchMock = vi.fn(() => protectedResponse)
    vi.stubGlobal('fetch', fetchMock)

    const request = api.post('/protected', { oldUserMutation: true })
    replaceSessionTokens('login-access', 'login-refresh')
    resolveProtected(jsonResponse({ data: { mutated: true }, error: null }))

    await expect(request).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('login-access')
    expect(getRefreshToken()).toBe('login-refresh')
  })

  it('ends the owning session when the request is still unauthorized after refresh', async () => {
    setAccessToken('old-access')
    setRefreshToken('old-refresh')
    const logoutListener = vi.fn()
    window.addEventListener('auth:logout', logoutListener)

    const fetchMock = vi.fn((input: string | URL | Request) => {
      if (String(input).endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          error: null,
        }))
      }
      return Promise.resolve(jsonResponse({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'expired' },
      }, 401))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/protected')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(logoutListener).toHaveBeenCalledOnce()

    window.removeEventListener('auth:logout', logoutListener)
  })
})
