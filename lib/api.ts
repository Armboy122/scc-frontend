import type { ApiResponse } from './types'
import { clearAllTokens, getAccessToken, getSessionVersion, rotateSessionToken } from './tokenStore'

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

const BASE_URL = (): string => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1'
let refreshRequest: Promise<string | null> | null = null

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null
  return document.cookie.split('; ').find((cookie) => cookie.startsWith('scc_csrf='))?.slice('scc_csrf='.length) ?? null
}

function withCredentials(options: RequestInit, headers: Record<string, string>): RequestInit {
  const csrf = csrfToken()
  if (csrf && !headers['X-CSRF-Token'] && !headers['x-csrf-token']) headers['X-CSRF-Token'] = csrf
  return { ...options, headers, credentials: 'include' }
}

async function doRefresh(): Promise<string | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const res = await fetch(`${BASE_URL()}/auth/refresh`, withCredentials({ method: 'POST' }, headers))
    if (!res.ok) return null
    const json = await res.json() as ApiResponse<{ accessToken: string }>
    if (!json.data?.accessToken) return null
    rotateSessionToken(json.data.accessToken)
    return json.data.accessToken
  } catch {
    return null
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) return refreshRequest
  const request = doRefresh()
  refreshRequest = request
  void request.finally(() => {
    if (refreshRequest === request) refreshRequest = null
  })
  return request
}

function signalLogout(): void {
  clearAllTokens()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth:logout'))
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<ApiResponse<T>> {
  const token = getAccessToken()
  const sessionVersion = getSessionVersion()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL()}${path}`, withCredentials(options, headers))

  if (!path.startsWith('/auth/') && getSessionVersion() !== sessionVersion) {
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }
  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    if (getSessionVersion() !== sessionVersion) {
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
    }
    if (await refreshAccessToken()) return request<T>(path, options, true)
    if (getSessionVersion() === sessionVersion) signalLogout()
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }
  if (res.status === 401 && isRetry && !path.startsWith('/auth/')) {
    signalLogout()
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }
  if (res.status === 204 && res.ok) return { data: null, error: null } as ApiResponse<T>

  let json: ApiResponse<T>
  try {
    json = await res.json() as ApiResponse<T>
  } catch {
    throw new ApiError('Invalid server response', 'PARSE_ERROR', res.status)
  }
  if (!res.ok) {
    const retryAfter = Number.parseInt(res.headers.get('Retry-After') ?? '', 10)
    throw new ApiError(json.error?.message ?? 'Request failed', json.error?.code ?? 'UNKNOWN', res.status,
      Number.isInteger(retryAfter) && retryAfter > 0 ? retryAfter : undefined)
  }
  return json
}

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()}` : ''
}

export const api = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return request<T>(`${path}${params ? buildQueryString(params) : ''}`, { method: 'GET' })
  },
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
  },
  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) })
  },
  delete<T>(path: string): Promise<ApiResponse<T>> { return request<T>(path, { method: 'DELETE' }) },
  async download(path: string): Promise<Blob> {
    const token = getAccessToken()
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(`${BASE_URL()}${path}`, withCredentials({}, headers))
    if (!response.ok) throw new ApiError('ไม่สามารถดาวน์โหลดไฟล์ได้', 'DOWNLOAD_FAILED', response.status)
    return response.blob()
  },
}
