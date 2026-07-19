/** Access tokens are memory-only. The refresh token is an httpOnly cookie. */
let accessToken: string | null = null
let sessionVersion = 0

export const getAccessToken = (): string | null => accessToken
export const setAccessToken = (token: string | null): void => { accessToken = token }
export const getSessionVersion = (): number => sessionVersion

export function replaceSessionToken(token: string): void {
  sessionVersion += 1
  accessToken = token
}

export function rotateSessionToken(token: string): void {
  accessToken = token
}

export function clearAllTokens(): void {
  sessionVersion += 1
  accessToken = null
}
