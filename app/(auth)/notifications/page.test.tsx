import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/lib/types'
import NotificationsPage from './page'

const {
  markReadMock,
  useNotificationsMock,
  useUnreadNotificationCountMock,
} = vi.hoisted(() => ({
  markReadMock: vi.fn(),
  useNotificationsMock: vi.fn(),
  useUnreadNotificationCountMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLAnchorElement>
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: useNotificationsMock,
  useUnreadNotificationCount: useUnreadNotificationCountMock,
  useMarkNotificationRead: () => ({
    mutate: markReadMock,
    isPending: false,
    variables: undefined,
  }),
}))

const notifications: Notification[] = [
  {
    id: 'removal',
    userId: 'user-1',
    type: 'REMOVAL_DUE',
    message: 'Removal is due',
    workOrderId: 'wo-1',
    createdAt: '2026-07-10T00:00:00Z',
  },
  {
    id: 'borrow-requested',
    userId: 'user-1',
    type: 'BORROW_REQUESTED',
    message: 'Borrow requested',
    borrowId: 'borrow-1',
    createdAt: '2026-07-10T00:01:00Z',
  },
  {
    id: 'borrow-approved',
    userId: 'user-1',
    type: 'BORROW_APPROVED',
    message: 'Borrow approved',
    borrowId: 'borrow-2',
    createdAt: '2026-07-10T00:02:00Z',
  },
  {
    id: 'borrow-rejected',
    userId: 'user-1',
    type: 'BORROW_REJECTED',
    message: 'Borrow rejected',
    borrowId: 'borrow-3',
    createdAt: '2026-07-10T00:03:00Z',
  },
  {
    id: 'borrow-activated',
    userId: 'user-1',
    type: 'BORROW_ACTIVATED',
    message: 'Borrow activated',
    borrowId: 'borrow-4',
    createdAt: '2026-07-10T00:04:00Z',
  },
  {
    id: 'borrow-overdue',
    userId: 'user-1',
    type: 'BORROW_OVERDUE',
    message: 'Borrow overdue',
    borrowId: 'borrow-5',
    createdAt: '2026-07-10T00:05:00Z',
  },
  {
    id: 'borrow-returned',
    userId: 'user-1',
    type: 'BORROW_RETURNED',
    message: 'Borrow returned',
    borrowId: 'borrow-6',
    createdAt: '2026-07-10T00:06:00Z',
  },
  {
    id: 'assigned',
    userId: 'user-1',
    type: 'WORKORDER_ASSIGNED',
    message: 'Work order assigned',
    workOrderId: 'wo-2',
    readAt: '2026-07-10T00:08:00Z',
    createdAt: '2026-07-10T00:07:00Z',
  },
  {
    id: 'discrepancy-reported',
    userId: 'user-1',
    type: 'DISCREPANCY_REPORTED',
    message: 'Discrepancy reported',
    discrepancyId: 'discrepancy-1',
    createdAt: '2026-07-10T00:08:00Z',
  },
  {
    id: 'discrepancy-resolved',
    userId: 'user-1',
    type: 'DISCREPANCY_RESOLVED',
    message: 'Discrepancy resolved',
    discrepancyId: 'discrepancy-2',
    createdAt: '2026-07-10T00:09:00Z',
  },
]

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationsMock.mockReturnValue({
      data: notifications,
      isLoading: false,
      error: null,
    })
    useUnreadNotificationCountMock.mockReturnValue({ data: 9 })
  })

  it('renders every backend type, canonical unread count, and correct deep links', () => {
    render(<NotificationsPage />)

    expect(screen.getByText('9 ใหม่')).toBeInTheDocument()
    expect(screen.getAllByText('ยังไม่อ่าน')).toHaveLength(9)
    expect(screen.getByRole('link', { name: /ถึงกำหนดถอดฉนวน/ })).toHaveAttribute('href', '/workorders/wo-1')
    expect(screen.getByRole('link', { name: /คำขอยืมฉนวนใหม่/ })).toHaveAttribute('href', '/borrows/borrow-1')
    expect(screen.getByRole('link', { name: /คำขอยืมได้รับอนุมัติ/ })).toHaveAttribute('href', '/borrows/borrow-2')
    expect(screen.getByRole('link', { name: /คำขอยืมถูกปฏิเสธ/ })).toHaveAttribute('href', '/borrows/borrow-3')
    expect(screen.getByRole('link', { name: /ยืนยันส่งมอบฉนวนแล้ว/ })).toHaveAttribute('href', '/borrows/borrow-4')
    expect(screen.getByRole('link', { name: /การยืมฉนวนเกินกำหนด/ })).toHaveAttribute('href', '/borrows/borrow-5')
    expect(screen.getByRole('link', { name: /รับคืนฉนวนแล้ว/ })).toHaveAttribute('href', '/borrows/borrow-6')
    expect(screen.getByRole('link', { name: /ได้รับมอบหมายใบงาน/ })).toHaveAttribute('href', '/workorders/wo-2')
    expect(screen.getByRole('link', { name: /พบข้อคลาดเคลื่อนใหม่/ })).toHaveAttribute('href', '/discrepancies/discrepancy-1')
    expect(screen.getByRole('link', { name: /ข้อคลาดเคลื่อนได้รับการปิดเรื่อง/ })).toHaveAttribute('href', '/discrepancies/discrepancy-2')
  })

  it('marks an unread notification when its deep link is activated', async () => {
    const user = userEvent.setup()
    render(<NotificationsPage />)

    await user.click(screen.getByRole('link', { name: /ถึงกำหนดถอดฉนวน/ }))

    expect(markReadMock).toHaveBeenCalledWith('removal')
  })
})
