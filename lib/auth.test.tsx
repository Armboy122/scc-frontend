import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'
import { api } from './api'
import { getAccessToken, getRefreshToken, setRefreshToken } from './tokenStore'

const { queryCacheClearMock, replaceMock } = vi.hoisted(() => ({
  queryCacheClearMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: queryCacheClearMock }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

function SessionProbe() {
  return <div>ready</div>
}

function LogoutProbe() {
  const { logout } = useAuth()
  return <button type="button" onClick={() => { void logout() }}>logout</button>
}

function LoginProbe() {
  const { login, user } = useAuth()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void login({ username: 'admin', password: 'Admin1234!' })
        }}
      >
        login
      </button>
      <span>{user?.username ?? 'anonymous'}</span>
    </>
  )
}

describe('AuthProvider session restore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('persists rotated refresh token after page reload restore', async () => {
    setRefreshToken('old-refresh')
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: {
          id: 'user-1',
          name: 'Tech One',
          username: 'tech1',
          role: 'tech',
          officeId: 'office-1',
        },
      },
      error: null,
    })

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument())
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh' })
    expect(getRefreshToken()).toBe('new-refresh')
  })

  it('deduplicates startup refresh when Strict Mode replays effects', async () => {
    setRefreshToken('strict-refresh')
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'strict-access-next',
        refreshToken: 'strict-refresh-next',
        user: {
          id: 'user-1',
          name: 'Tech One',
          username: 'tech1',
          role: 'tech',
          officeId: 'office-1',
        },
      },
      error: null,
    })

    render(
      <StrictMode>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </StrictMode>,
    )

    await waitFor(() => expect(getRefreshToken()).toBe('strict-refresh-next'))
    expect(
      vi.mocked(api.post).mock.calls.filter(([path]) => path === '/auth/refresh'),
    ).toHaveLength(1)
  })

  it('sends the latest refresh token to logout before clearing local auth state', async () => {
    const user = userEvent.setup()
    setRefreshToken('old-refresh')
    let resolveLogout!: (value: { data: null; error: null }) => void
    const pendingLogout = new Promise<{ data: null; error: null }>((resolve) => {
      resolveLogout = resolve
    })
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/auth/refresh') {
        return {
          data: {
            accessToken: 'new-access',
            refreshToken: 'rotated-refresh',
            user: {
              id: 'user-1',
              name: 'Tech One',
              username: 'tech1',
              role: 'tech' as const,
              officeId: 'office-1',
            },
          },
          error: null,
        }
      }
      if (path === '/auth/logout') return pendingLogout
      throw new Error(`Unexpected POST ${path}`)
    })

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(getRefreshToken()).toBe('rotated-refresh'))
    await user.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'rotated-refresh',
      })
      expect(getRefreshToken()).toBeNull()
      expect(replaceMock).toHaveBeenCalledWith('/login')
      expect(queryCacheClearMock).toHaveBeenCalledTimes(1)
    })

    // Server revocation is still pending, proving local logout did not wait
    // for the network before removing cached data and credentials.
    resolveLogout({ data: null, error: null })
  })

  it('does not let a stale restore failure clear a newer successful login', async () => {
    const user = userEvent.setup()
    setRefreshToken('stale-refresh')

    let rejectRestore!: (reason: Error) => void
    const pendingRestore = new Promise<never>((_resolve, reject) => {
      rejectRestore = reject
    })

    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/auth/refresh') return pendingRestore
      if (path === '/auth/login') {
        return {
          data: {
            accessToken: 'login-access',
            refreshToken: 'login-refresh',
            user: {
              id: 'admin-1',
              name: 'Admin One',
              username: 'admin',
              role: 'admin' as const,
              officeId: null,
            },
          },
          error: null,
        }
      }
      throw new Error(`Unexpected POST ${path}`)
    })

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'stale-refresh',
      })
    })

    await user.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(getAccessToken()).toBe('login-access')
      expect(getRefreshToken()).toBe('login-refresh')
      expect(queryCacheClearMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      rejectRestore(new Error('stale refresh failed'))
      await pendingRestore.catch(() => undefined)
    })

    expect(getAccessToken()).toBe('login-access')
    expect(getRefreshToken()).toBe('login-refresh')
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('clears cached server data before publishing an explicit login session', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'next-access',
        refreshToken: 'next-refresh',
        user: {
          id: 'exec-2',
          name: 'Exec Two',
          username: 'exec2',
          role: 'exec',
          officeId: 'office-2',
        },
      },
      error: null,
    })

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(queryCacheClearMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('exec2')).toBeInTheDocument()
    })
  })
})
