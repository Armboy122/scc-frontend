'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'
import { clearAllTokens, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStore'
import type { LoginRequest, RefreshResponse, User } from './types'

// ─── Context types ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (creds: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Restore session from persisted refresh token on mount
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        setIsLoading(false)
        return
      }
      try {
        const res = await api.post<RefreshResponse>('/auth/refresh', { refreshToken })
        if (!cancelled && res.data) {
          setAccessToken(res.data.accessToken)
          if (res.data.refreshToken) {
            setRefreshToken(res.data.refreshToken)
          }
          setUser(res.data.user)
        }
      } catch {
        clearAllTokens()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, [])

  // Listen for forced logout events emitted by api.ts when refresh fails
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null)
      clearAllTokens()
      router.replace('/login')
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [router])

  const login = useCallback(async (creds: LoginRequest) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login',
      creds,
    )
    if (!res.data) throw new Error('Login failed: empty response')
    setAccessToken(res.data.accessToken)
    setRefreshToken(res.data.refreshToken)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Swallow — we clear local state regardless
    } finally {
      setUser(null)
      clearAllTokens()
      router.replace('/login')
    }
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
