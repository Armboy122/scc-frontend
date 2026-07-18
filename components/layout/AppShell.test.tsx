import { render, screen, waitFor } from '@testing-library/react'
import { User } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AppShell,
  getMobileNavItems,
  getVisibleNavItems,
  isPhaseRouteEnabled,
  type NavItem,
} from './AppShell'

const { replaceMock, useAuthMock, usePathnameMock, useUnreadNotificationCountMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useUnreadNotificationCountMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/lib/auth', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useAuth: useAuthMock,
}))

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadNotificationCount: useUnreadNotificationCountMock,
}))

const FLAGS_OFF = {
  phase2Borrowing: false,
  phase3Expansion: false,
}

describe('AppShell navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/')
    useAuthMock.mockReturnValue({
      user: {
        id: 'exec-1',
        name: 'Executive One',
        username: 'exec1',
        role: 'exec',
        officeId: 'office-1',
      },
      logout: vi.fn(),
    })
    useUnreadNotificationCountMock.mockReturnValue({ data: 7 })
  })

  it('keeps every allowed Phase 1 route reachable on mobile', () => {
    const icon = User
    const items: NavItem[] = [
      { href: '/', label: 'ใบงาน', icon },
      { href: '/dashboard', label: 'แดชบอร์ด', icon },
      { href: '/stock', label: 'สต็อก', icon },
      { href: '/covers', label: 'ฉนวน', icon },
      { href: '/notifications', label: 'แจ้งเตือน', icon },
      { href: '/profile', label: 'โปรไฟล์', icon },
    ]

    expect(getMobileNavItems(items).map((item) => item.href)).toEqual([
      '/',
      '/dashboard',
      '/stock',
      '/covers',
      '/notifications',
      '/profile',
    ])
  })

  it('exposes role-allowed Phase 1 routes and hides Phase 2/3 by default', () => {
    expect(getVisibleNavItems('exec', FLAGS_OFF).map((item) => item.href)).toEqual([
      '/',
      '/dashboard',
      '/stock',
      '/covers',
      '/notifications',
      '/profile',
    ])
    expect(getVisibleNavItems('tech', FLAGS_OFF).map((item) => item.href)).toEqual([
      '/',
      '/stock',
      '/covers',
      '/notifications',
      '/profile',
    ])
  })

  it('reveals unfinished routes only when their explicit feature flag is enabled', () => {
    const enabled = { phase2Borrowing: true, phase3Expansion: true }

    expect(getVisibleNavItems('exec', enabled).map((item) => item.href)).toContain('/borrows')
    expect(getVisibleNavItems('exec', enabled).map((item) => item.href)).toContain('/discrepancies')
    expect(getVisibleNavItems('admin', enabled).map((item) => item.href)).toContain('/borrows')
    expect(getVisibleNavItems('admin', enabled).map((item) => item.href)).toContain('/discrepancies')
    expect(getVisibleNavItems('admin', enabled).map((item) => item.href)).toEqual(expect.arrayContaining([
      '/admin/usage-modes',
      '/admin/rfid',
      '/admin/reports',
    ]))
  })

  it('keeps NFC tools available while Phase 2/3 routes remain flag-gated', () => {
    expect(isPhaseRouteEnabled('/covers/check-tag', FLAGS_OFF)).toBe(true)
    expect(isPhaseRouteEnabled('/covers/write-nfc', FLAGS_OFF)).toBe(true)
    expect(isPhaseRouteEnabled('/covers/register/batch', FLAGS_OFF)).toBe(true)
    expect(isPhaseRouteEnabled('/covers/cover-1', FLAGS_OFF)).toBe(true)
    expect(isPhaseRouteEnabled('/borrows/borrow-1', FLAGS_OFF)).toBe(false)
    expect(isPhaseRouteEnabled('/discrepancies/discrepancy-1', FLAGS_OFF)).toBe(false)
    expect(isPhaseRouteEnabled('/admin/rfid', FLAGS_OFF)).toBe(false)
    expect(isPhaseRouteEnabled('/dashboard', FLAGS_OFF)).toBe(true)
    expect(isPhaseRouteEnabled('/borrows/borrow-1', {
      ...FLAGS_OFF,
      phase2Borrowing: true,
    })).toBe(true)
    expect(isPhaseRouteEnabled('/discrepancies/new', {
      ...FLAGS_OFF,
      phase2Borrowing: true,
    })).toBe(true)
  })

  it('renders the canonical unread badge in desktop and mobile notification navigation', () => {
    render(<AppShell><p>content</p></AppShell>)

    expect(screen.getAllByLabelText('7 รายการยังไม่อ่าน')).toHaveLength(2)
    expect(screen.queryByText('ใบยืม')).not.toBeInTheDocument()
    expect(screen.queryByText('ข้อคลาดเคลื่อน')).not.toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('redirects and renders no Phase 2 discrepancy content while the flag is off', async () => {
    usePathnameMock.mockReturnValue('/discrepancies/discrepancy-1')

    render(<AppShell><p>sensitive discrepancy content</p></AppShell>)

    expect(screen.queryByText('sensitive discrepancy content')).not.toBeInTheDocument()
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
  })
})
