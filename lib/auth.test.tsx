import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './auth'
import { api } from './api'
import { getRefreshToken, setRefreshToken } from './tokenStore'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

function SessionProbe() {
  return <div>ready</div>
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
})
