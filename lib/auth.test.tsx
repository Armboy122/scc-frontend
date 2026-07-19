import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'
import { api } from './api'
import { getAccessToken } from './tokenStore'

const { clearMock, replaceMock } = vi.hoisted(() => ({ clearMock: vi.fn(), replaceMock: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: clearMock }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }))
vi.mock('./api', () => ({ api: { post: vi.fn() } }))

function Probe() {
  const { login, logout, user } = useAuth()
  return <><button onClick={() => void login({ username: 'admin', password: 'Admin1234!' })}>login</button>
    <button onClick={() => void logout()}>logout</button><span>{user?.username ?? 'anonymous'}</span></>
}
const user = { id: 'u1', name: 'Admin', username: 'admin', role: 'admin' as const, officeId: null }

describe('AuthProvider cookie sessions', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('restores a session via the server cookie without a token payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { accessToken: 'restored', user }, error: null })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument())
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(getAccessToken()).toBe('restored')
  })
  it('logs in and logs out without exposing a refresh token', async () => {
    const interaction = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { accessToken: 'login', user }, error: null }).mockResolvedValueOnce({ data: null, error: null })
    render(<AuthProvider><Probe /></AuthProvider>)
    await interaction.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument())
    await interaction.click(screen.getByRole('button', { name: 'logout' }))
    expect(api.post).toHaveBeenLastCalledWith('/auth/logout', undefined)
    expect(replaceMock).toHaveBeenCalledWith('/login')
  })
})
