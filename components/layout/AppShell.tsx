'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  User,
} from 'lucide-react'
import { useAuth, AuthGuard } from '@/lib/auth'
import type { Role } from '@/lib/types'

// ─── Nav definition ───────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',              label: 'ใบงาน',    icon: ClipboardList },
  { href: '/dashboard',    label: 'แดชบอร์ด',  icon: BarChart3,  roles: ['admin', 'exec'] },
  { href: '/stock',        label: 'สต็อก',     icon: Package },
  { href: '/covers',       label: 'ฉนวน',      icon: Shield },
  { href: '/borrows',      label: 'ใบยืม',     icon: Handshake,  roles: ['exec', 'tech'] },
  { href: '/admin/usage-modes', label: 'โหมดใช้งาน', icon: BriefcaseBusiness, roles: ['admin'] },
  { href: '/admin/rfid',   label: 'RFID',       icon: Radio,      roles: ['admin'] },
  { href: '/admin/reports', label: 'รายงาน',    icon: FileBarChart, roles: ['admin'] },
  { href: '/notifications', label: 'แจ้งเตือน', icon: Bell },
  { href: '/profile',      label: 'โปรไฟล์',   icon: User },
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

function SidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
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
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

// ─── Bottom nav item (mobile) ─────────────────────────────────────────────────

function BottomNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
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
      <Icon
        className={['w-6 h-6', active ? 'text-pea-600' : 'text-gray-400'].join(' ')}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function getMobileNavItems(items: NavItem[]): NavItem[] {
  const maxItems = 5
  const profileItem = items.find((item) => item.href === '/profile')

  if (!profileItem || items.length <= maxItems) {
    return items.slice(0, maxItems)
  }

  return [
    ...items.filter((item) => item.href !== '/profile').slice(0, maxItems - 1),
    profileItem,
  ]
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

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  )

  // Mobile bottom nav: max 5 items, but keep profile reachable for account actions.
  const mobileItems = getMobileNavItems(visibleItems)

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
          {visibleItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} pathname={pathname} />
          ))}
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
        <div className="flex items-stretch">
          {mobileItems.map((item) => (
            <div key={item.href} className="flex-1">
              <BottomNavItem item={item} pathname={pathname} />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
