import type { ApiResponse } from './types'
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken } from './tokenStore'

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

// ─── Token refresh coordination ───────────────────────────────────────────────

type RefreshSubscriber = (token: string) => void

let isRefreshing = false
let refreshSubscribers: RefreshSubscriber[] = []

function subscribeTokenRefresh(cb: RefreshSubscriber): void {
  refreshSubscribers.push(cb)
}

function notifyRefreshSubscribers(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1'
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken?: string }>
    const newToken = json.data?.accessToken ?? null
    if (newToken) setAccessToken(newToken)
    if (json.data?.refreshToken) setRefreshToken(json.data.refreshToken)
    return newToken
  } catch {
    return null
  }
}

function signalLogout(): void {
  setAccessToken(null)
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL()}${path}`, { ...options, headers })

  // ── Token refresh + retry ────────────────────────────────────────────────
  if (res.status === 401 && !isRetry) {
    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await doRefresh()
      isRefreshing = false

      if (newToken) {
        notifyRefreshSubscribers(newToken)
        return request<T>(path, options, true)
      }

      signalLogout()
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
    }

    // Another request is already refreshing — queue this one
    return new Promise<ApiResponse<T>>((resolve, reject) => {
      subscribeTokenRefresh(() => {
        request<T>(path, options, true).then(resolve).catch(reject)
      })
    })
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
    throw new ApiError(
      json.error?.message ?? 'Request failed',
      json.error?.code ?? 'UNKNOWN',
      res.status,
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
