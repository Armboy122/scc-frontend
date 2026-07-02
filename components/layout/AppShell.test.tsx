import { User } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { getMobileNavItems } from './AppShell'

describe('getMobileNavItems', () => {
  const icon = User

  it('keeps profile reachable when role navigation has more than five items', () => {
    const items = [
      { href: '/', label: 'ใบงาน', icon },
      { href: '/dashboard', label: 'แดชบอร์ด', icon },
      { href: '/stock', label: 'สต็อก', icon },
      { href: '/covers', label: 'ฉนวน', icon },
      { href: '/borrows', label: 'ใบยืม', icon },
      { href: '/notifications', label: 'แจ้งเตือน', icon },
      { href: '/profile', label: 'โปรไฟล์', icon },
    ]

    const mobileItems = getMobileNavItems(items)

    expect(mobileItems).toHaveLength(5)
    expect(mobileItems.map((item) => item.href)).toEqual([
      '/',
      '/dashboard',
      '/stock',
      '/covers',
      '/profile',
    ])
  })
})
