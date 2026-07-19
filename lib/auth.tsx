'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from './api'
import { clearAllTokens, replaceSessionToken } from './tokenStore'
import type { ApiResponse, LoginRequest, RefreshResponse, User } from './types'

// React Strict Mode intentionally replays effects in development. Reusing the
// same startup request is mandatory because refresh tokens are single-use and
// the backend correctly treats a duplicate rotation attempt as a replay.
let sessionRestoreRequest: Promise<ApiResponse<RefreshResponse>> | null = null

function restoreSessionOnce(): Promise<ApiResponse<RefreshResponse>> {
  if (sessionRestoreRequest) return sessionRestoreRequest
  const request = api.post<RefreshResponse>('/auth/refresh')
  sessionRestoreRequest = request

  const releaseRequest = () => {
    // Keep the settled promise through the current turn so Strict Mode's
    // immediate effect replay can still reuse it, then allow a later mount to
    // retry a transient failure normally.
    window.setTimeout(() => {
      if (sessionRestoreRequest === request) sessionRestoreRequest = null
    }, 0)
  }
  void request.then(releaseRequest, releaseRequest)

  return request
}

// ─── Context types ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (creds: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authOperationRef = useRef(0)
  const queryClient = useQueryClient()
  const router = useRouter()

  // Restore session from persisted refresh token on mount
  useEffect(() => {
    let cancelled = false
    const restoreOperation = authOperationRef.current
    const isCurrentRestore = () => (
      !cancelled && authOperationRef.current === restoreOperation
    )

    async function restoreSession() {
      try {
        const res = await restoreSessionOnce()
        if (isCurrentRestore() && res.data) {
          replaceSessionToken(res.data.accessToken)
          setUser(res.data.user)
        }
      } catch {
        // A manual login can finish while this startup refresh is still in
        // flight. Only the operation that owns the current session may clear
        // it; otherwise a stale failure would erase the newly issued tokens.
        if (isCurrentRestore()) {
          clearAllTokens()
          setUser(null)
        }
      } finally {
        if (isCurrentRestore()) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, [])

  // Listen for forced logout events emitted by api.ts when refresh fails
  useEffect(() => {
    const handleForcedLogout = () => {
      queryClient.clear()
      setUser(null)
      clearAllTokens()
      router.replace('/login')
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [queryClient, router])

  const login = useCallback(async (creds: LoginRequest) => {
    // Supersede any startup restore before awaiting the login response. This
    // prevents a delayed refresh result from overwriting the explicit login.
    const loginOperation = ++authOperationRef.current
    try {
      const res = await api.post<{ accessToken: string; user: User }>(
        '/auth/login',
        creds,
      )
      if (!res.data) throw new Error('Login failed: empty response')
      if (authOperationRef.current !== loginOperation) return
      // React Query keys are intentionally domain-oriented and do not embed a
      // user id. Clear the previous identity's server state before exposing a
      // new session so cached office/role data can never flash across users.
      queryClient.clear()
      replaceSessionToken(res.data.accessToken)
      setUser(res.data.user)
    } finally {
      if (authOperationRef.current === loginOperation) setIsLoading(false)
    }
  }, [queryClient])

  const logout = useCallback(async () => {
    // Start revocation while the current access token is still available for
    // the request headers, then end the local session immediately. Logout must
    // not leave sensitive screens/cache visible while the network is slow.
    const revokeRequest = api.post(
      '/auth/logout',
      undefined,
    )
    ++authOperationRef.current
    queryClient.clear()
    setUser(null)
    clearAllTokens()
    router.replace('/login')

    try {
      await revokeRequest
    } catch {
      // Swallow — the local session has already ended regardless.
    }
  }, [queryClient, router])

  const updateUser = useCallback((nextUser: User) => setUser(nextUser), [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div
          className="w-10 h-10 rounded-full border-4 border-pea-200 border-t-pea-600 animate-spin"
          aria-label="กำลังโหลด"
        />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
