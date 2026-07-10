/**
 * Token store — access token held in memory only (never persisted).
 * Refresh token uses localStorage as a dev-friendly fallback.
 * In production, prefer httpOnly cookies set by the server.
 */

const REFRESH_TOKEN_KEY = 'scc_refresh'

let _accessToken: string | null = null
let _sessionVersion = 0

export function getAccessToken(): string | null {
  return _accessToken
}

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getSessionVersion(): number {
  return _sessionVersion
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

/** Publish tokens for a new explicit auth identity/session boundary. */
export function replaceSessionTokens(accessToken: string, refreshToken: string): void {
  _sessionVersion += 1
  setRefreshToken(refreshToken)
  setAccessToken(accessToken)
}

/** Rotate credentials within the current identity without changing ownership. */
export function rotateSessionTokens(accessToken: string, refreshToken: string): void {
  setRefreshToken(refreshToken)
  setAccessToken(accessToken)
}

export function clearAllTokens(): void {
  _sessionVersion += 1
  _accessToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}
