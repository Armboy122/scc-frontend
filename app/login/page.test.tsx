import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import LoginPage from './page'

const { loginMock, replaceMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ login: loginMock }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses POST as the native pre-hydration fallback so credentials never enter the URL', () => {
    const { container } = render(<LoginPage />)

    expect(container.querySelector('form')).toHaveAttribute('method', 'post')
  })

  it('provides a 44px password visibility toggle for touch input', () => {
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' })).toHaveClass('h-11', 'w-11')
  })

  it('surfaces backend rate-limit wait time without replaying credentials', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValueOnce(
      new ApiError('too many login attempts', 'RATE_LIMITED', 429, 45),
    )
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/^ชื่อผู้ใช้\s*\*$/), 'admin')
    await user.type(screen.getByLabelText(/^รหัสผ่าน\s*\*$/), 'wrong')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 45 วินาทีแล้วลองใหม่',
    )
    expect(loginMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('navigates only after the auth provider publishes a successful login', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValueOnce(undefined)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/^ชื่อผู้ใช้\s*\*$/), 'admin')
    await user.type(screen.getByLabelText(/^รหัสผ่าน\s*\*$/), 'Admin1234!')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ username: 'admin', password: 'Admin1234!' })
      expect(replaceMock).toHaveBeenCalledWith('/')
    })
  })
})
