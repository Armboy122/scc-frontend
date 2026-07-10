import type { ApiResponse } from './types'
import {
  clearAllTokens,
  getAccessToken,
  getRefreshToken,
  getSessionVersion,
  rotateSessionTokens,
} from './tokenStore'

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfterSeconds?: number

  constructor(message: string, code: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

// ─── Token refresh coordination ───────────────────────────────────────────────

let refreshRequest: {
  refreshToken: string
  response: Promise<string | null>
} | null = null

async function doRefresh(refreshToken: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1'
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>
    if (!json.data?.accessToken || !json.data.refreshToken) return null

    // A manual login/logout may finish while this request is in flight. Only
    // the session that presented this refresh token may publish the rotated
    // pair; otherwise a stale response could resurrect or overwrite a newer
    // session.
    if (getRefreshToken() !== refreshToken) return null

    // The backend rotates refresh tokens. Publish the pair together only when
    // both values are present, so a new access token is never paired with a
    // refresh token the server has already revoked.
    rotateSessionTokens(json.data.accessToken, json.data.refreshToken)
    return json.data.accessToken
  } catch {
    return null
  }
}

function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.resolve(null)
  if (refreshRequest?.refreshToken === refreshToken) return refreshRequest.response

  // Scope single-flight coordination to the exact refresh token. A new login
  // must not inherit and await an older session's pending refresh request.
  const response = doRefresh(refreshToken)
  const request = { refreshToken, response }
  refreshRequest = request
  void response.finally(() => {
    if (refreshRequest === request) refreshRequest = null
  })
  return response
}

function signalLogout(): void {
  clearAllTokens()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:logout'))
  }
}

// ─── Core request function ────────────────────────────────────────────────────

const BASE_URL = (): string =>
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1'

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<ApiResponse<T>> {
  const token = getAccessToken()
  const sessionVersion = getSessionVersion()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL()}${path}`, { ...options, headers })

  // A protected response belongs to the auth session that sent it. If login,
  // logout or forced expiry crossed that boundary while the request was in
  // flight, discard even a successful response so an old user's delayed
  // mutation/query cannot populate the new user's cache.
  if (!path.startsWith('/auth/') && getSessionVersion() !== sessionVersion) {
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }

  // ── Token refresh + retry ────────────────────────────────────────────────
  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    // The request was sent before an explicit login/logout boundary. Never
    // refresh or replay it under the identity that is current now.
    if (getSessionVersion() !== sessionVersion) {
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
    }
    // Every concurrent 401 awaits the same refresh result. This guarantees
    // queued requests reject as well as resolve, instead of hanging forever
    // when refresh fails.
    const refreshOwner = getRefreshToken()
    const newToken = await refreshAccessToken()
    if (getSessionVersion() !== sessionVersion) {
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
    }
    if (newToken) {
      return request<T>(path, options, true)
    }

    // The refresh belonged to a session that was superseded while it was in
    // flight. A newer explicit login/logout wins, but the original request is
    // never replayed under that different identity: doing so could execute an
    // old user's mutation with the new user's authorization.
    if (getRefreshToken() !== refreshOwner) {
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
    }

    signalLogout()
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }

  // A freshly rotated credential that is still rejected is not recoverable by
  // another refresh loop. End only the session that owns this retry.
  if (res.status === 401 && isRetry && !path.startsWith('/auth/')) {
    signalLogout()
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }

  // ── Parse response ───────────────────────────────────────────────────────
  if (res.status === 204) {
    if (!res.ok) {
      throw new ApiError('Request failed', 'UNKNOWN', res.status)
    }
    return { data: null, error: null } as ApiResponse<T>
  }

  let json: ApiResponse<T>
  try {
    json = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError('Invalid server response', 'PARSE_ERROR', res.status)
  }

  if (!res.ok) {
    const retryAfter = Number.parseInt(res.headers.get('Retry-After') ?? '', 10)
    throw new ApiError(
      json.error?.message ?? 'Request failed',
      json.error?.code ?? 'UNKNOWN',
      res.status,
      Number.isInteger(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    )
  }

  return json
}

// ─── Typed API surface ────────────────────────────────────────────────────────

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}

export const api = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const qs = params ? buildQueryString(params) : ''
    return request<T>(`${path}${qs}`, { method: 'GET' })
  },

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  delete<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path, { method: 'DELETE' })
  },
}
