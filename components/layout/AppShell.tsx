'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  FileBarChart,
  Handshake,
  LogOut,
  Package,
  Radio,
  Shield,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { useAuth, AuthGuard } from '@/lib/auth'
import {
  PHASE_FEATURE_FLAGS,
  type PhaseFeatureFlags,
} from '@/lib/featureFlags'
import type { Role } from '@/lib/types'

// ─── Nav definition ───────────────────────────────────────────────────────────

export interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: Role[]
  feature?: keyof PhaseFeatureFlags
  section?: 'operations' | 'admin' | 'account'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'ใบงาน', icon: ClipboardList, section: 'operations' },
  { href: '/dashboard', label: 'แดชบอร์ด', icon: BarChart3, roles: ['admin', 'exec'], section: 'operations' },
  { href: '/stock', label: 'สต็อก', icon: Package, section: 'operations' },
  { href: '/covers', label: 'ฉนวน', icon: Shield, section: 'operations' },
  { href: '/borrows', label: 'ใบยืม', icon: Handshake, roles: ['admin', 'exec', 'tech'], feature: 'phase2Borrowing', section: 'operations' },
  { href: '/discrepancies', label: 'ข้อคลาดเคลื่อน', icon: TriangleAlert, roles: ['admin', 'exec', 'tech'], feature: 'phase2Borrowing', section: 'operations' },
  { href: '/admin', label: 'เพิ่มเติม', icon: BriefcaseBusiness, roles: ['admin'], section: 'admin' },
  { href: '/admin/users', label: 'ผู้ใช้งาน', icon: Users, roles: ['admin'], section: 'admin' },
  { href: '/admin/usage-modes', label: 'โหมดใช้งาน', icon: BriefcaseBusiness, roles: ['admin'], feature: 'phase3Expansion', section: 'admin' },
  { href: '/admin/rfid', label: 'ตรวจนับ RFID', icon: Radio, roles: ['admin'], feature: 'phase3Expansion', section: 'admin' },
  { href: '/admin/reports', label: 'รายงาน', icon: FileBarChart, roles: ['admin'], feature: 'phase3Expansion', section: 'admin' },
  { href: '/notifications', label: 'แจ้งเตือน', icon: Bell, section: 'account' },
  { href: '/profile', label: 'โปรไฟล์', icon: User, section: 'account' },
]

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  exec:  'ผู้บริหาร',
  tech:  'ช่าง',
}

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-pea-600 text-white',
  exec:  'bg-amber-100 text-amber-800',
  tech:  'bg-sky-100 text-sky-800',
}

// ─── Active check ─────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  pathname,
  badgeCount = 0,
}: {
  item: NavItem
  pathname: string
  badgeCount?: number
}) {
  const active = isActive(item.href, pathname)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium min-w-0',
        'transition-colors duration-150',
        'touch-target',
        active
          ? 'bg-pea-600/60 text-white'
          : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {badgeCount > 0 && (
        <span
          className="min-w-5 rounded-full bg-white px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-pea-700"
          aria-label={`${badgeCount} รายการยังไม่อ่าน`}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  )
}

// ─── Bottom nav item (mobile) ─────────────────────────────────────────────────

function BottomNavItem({
  item,
  pathname,
  badgeCount = 0,
}: {
  item: NavItem
  pathname: string
  badgeCount?: number
}) {
  const active = isActive(item.href, pathname)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={[
        'flex flex-col items-center gap-1 py-2 px-1 text-xs font-medium',
        'transition-colors duration-150 min-w-0',
        active
          ? 'text-pea-600'
          : 'text-gray-500 hover:text-gray-900',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative">
        <Icon
          className={['w-6 h-6', active ? 'text-pea-600' : 'text-gray-400'].join(' ')}
          aria-hidden
        />
        {badgeCount > 0 && (
          <span
            className="absolute -right-3 -top-2 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white"
            aria-label={`${badgeCount} รายการยังไม่อ่าน`}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function getMobileNavItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => ['/', '/dashboard', '/stock', '/covers', '/admin', '/notifications', '/profile'].includes(item.href))
}

export function getVisibleNavItems(
  role: Role | undefined,
  flags: PhaseFeatureFlags = PHASE_FEATURE_FLAGS,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && (!role || !item.roles.includes(role))) return false
    if (item.feature && !flags[item.feature]) return false
    return true
  })
}

export function isPhaseRouteEnabled(
  pathname: string,
  flags: PhaseFeatureFlags = PHASE_FEATURE_FLAGS,
): boolean {
  // The cover area is a read-only inventory view. NFC handling and
  // registration are intentionally unavailable from both navigation and
  // direct URLs until an operational role needs them again.
  if (
    pathname === '/covers/check-tag' || pathname.startsWith('/covers/check-tag/')
    || pathname === '/covers/write-nfc' || pathname.startsWith('/covers/write-nfc/')
    || pathname === '/covers/register' || pathname.startsWith('/covers/register/')
  ) return false
  // These administration modules are intentionally parked until the next
  // operational phase. Keep direct URLs from exposing unfinished screens.
  if (
    pathname === '/admin/offices' || pathname.startsWith('/admin/offices/')
    || pathname === '/admin/workhubs' || pathname.startsWith('/admin/workhubs/')
    || pathname === '/admin/rfid' || pathname.startsWith('/admin/rfid/')
  ) return false
  if (pathname === '/borrows' || pathname.startsWith('/borrows/')) {
    return flags.phase2Borrowing
  }
  if (pathname === '/discrepancies' || pathname.startsWith('/discrepancies/')) {
    return flags.phase2Borrowing
  }
  if (
    pathname === '/admin/usage-modes'
    || pathname.startsWith('/admin/usage-modes/')
    || pathname === '/admin/reports'
    || pathname.startsWith('/admin/reports/')
  ) {
    return flags.phase3Expansion
  }
  return true
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShellInner>{children}</AppShellInner>
    </AuthGuard>
  )
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { data: unreadNotificationCount = 0 } = useUnreadNotificationCount(Boolean(user))
  const routeEnabled = isPhaseRouteEnabled(pathname)

  useEffect(() => {
    if (!routeEnabled) router.replace('/')
  }, [routeEnabled, router])

  const visibleItems = getVisibleNavItems(user?.role)

  // Keep every allowed Phase 1 route reachable; flagged expansion routes can scroll.
  const mobileItems = getMobileNavItems(visibleItems)

  if (!routeEnabled) return null

  return (
    <div className="flex h-dvh bg-gray-50">
      {/* ── Sidebar (desktop) ──────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-[240px] flex-shrink-0"
        style={{ background: 'var(--sidebar-bg)' }}
        aria-label="เมนูหลัก"
      >
        {/* Logo / brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--color-primary)' }}
              aria-hidden
            >
              SC
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">Smart Cover</p>
              <p className="text-white/50 text-xs mt-0.5">Connect</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(['operations', 'admin', 'account'] as const).map((section) => {
            const items = visibleItems.filter((item) => item.section === section)
            if (!items.length) return null
            return <div key={section} className="space-y-1 pb-3">
              {section !== 'operations' && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-white/45">{section === 'admin' ? 'ผู้ดูแลระบบ' : 'บัญชี'}</p>}
              {items.map((item) => <SidebarNavItem key={item.href} item={item} pathname={pathname} badgeCount={item.href === '/notifications' ? unreadNotificationCount : 0} />)}
            </div>
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="px-3 py-4 border-t border-white/10 space-y-2">
            <div className="px-3 py-2">
              <p className="text-white text-sm font-medium leading-tight truncate">{user.name}</p>
              {user.office && (
                <p className="text-white/50 text-xs mt-0.5 truncate">{user.office.name}</p>
              )}
              <span
                className={['badge mt-1.5 text-xs', ROLE_BADGE[user.role]].join(' ')}
              >
                {ROLE_LABEL[user.role]}
              </span>
            </div>
            <button
              onClick={() => void logout()}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden />
              ออกจากระบบ
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header (mobile) */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 bg-white"
          style={{ boxShadow: 'var(--tw-shadow, 0 1px 0 0 rgb(0 0 0 / 0.06))' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'var(--color-primary)' }}
              aria-hidden
            >
              SC
            </div>
            <span className="font-semibold text-gray-900 text-sm truncate">Smart Cover Connect</span>
          </div>
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={['badge text-xs', ROLE_BADGE[user.role]].join(' ')}>
                {ROLE_LABEL[user.role]}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="touch-target w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="ออกจากระบบ"
              >
                <LogOut className="w-5 h-5" aria-hidden />
              </button>
            </div>
          )}
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
          id="main-content"
        >
          {children}
        </main>
      </div>

      {/* ── Bottom navigation (mobile only) ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40"
        aria-label="เมนูล่าง"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch overflow-x-auto">
          {mobileItems.map((item) => (
            <div key={item.href} className="min-w-16 flex-1">
              <BottomNavItem
                item={item}
                pathname={pathname}
                badgeCount={item.href === '/notifications' ? unreadNotificationCount : 0}
              />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
