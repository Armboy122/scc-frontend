'use client'

import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  CircleX,
  ClipboardCheck,
  Clock,
  Handshake,
  Info,
  PackageCheck,
  RotateCcw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications'
import {
  getNotificationHref,
  getNotificationTitle,
} from '@/lib/notificationPresentation'
import type { Notification, NotificationType } from '@/lib/types'

interface NotificationTypeConfig {
  icon: LucideIcon
  iconClass: string
  bgClass: string
}

const TYPE_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  REMOVAL_DUE: {
    icon: Clock,
    iconClass: 'text-orange-600',
    bgClass: 'bg-orange-50',
  },
  BORROW_REQUESTED: {
    icon: Handshake,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
  },
  BORROW_APPROVED: {
    icon: CheckCircle2,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-50',
  },
  BORROW_REJECTED: {
    icon: CircleX,
    iconClass: 'text-red-600',
    bgClass: 'bg-red-50',
  },
  BORROW_ACTIVATED: {
    icon: PackageCheck,
    iconClass: 'text-violet-600',
    bgClass: 'bg-violet-50',
  },
  BORROW_OVERDUE: {
    icon: TriangleAlert,
    iconClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
  },
  BORROW_RETURNED: {
    icon: RotateCcw,
    iconClass: 'text-teal-600',
    bgClass: 'bg-teal-50',
  },
  DISCREPANCY_REPORTED: {
    icon: TriangleAlert,
    iconClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
  },
  DISCREPANCY_RESOLVED: {
    icon: ClipboardCheck,
    iconClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
  },
  WORKORDER_ASSIGNED: {
    icon: ClipboardCheck,
    iconClass: 'text-violet-600',
    bgClass: 'bg-violet-50',
  },
}

const FALLBACK_CONFIG: NotificationTypeConfig = {
  icon: Info,
  iconClass: 'text-gray-600',
  bgClass: 'bg-gray-100',
}

const SKELETON_IDS = ['notification-1', 'notification-2', 'notification-3', 'notification-4']

function notificationTypeConfig(type: string): NotificationTypeConfig {
  return TYPE_CONFIG[type as NotificationType] ?? FALLBACK_CONFIG
}

function formatNotificationDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'ไม่ทราบเวลา'
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface NotificationItemProps {
  notification: Notification
  isMarkingRead: boolean
  onRead: (id: string) => void
}

function NotificationItem({ notification, isMarkingRead, onRead }: NotificationItemProps) {
  const config = notificationTypeConfig(notification.type)
  const Icon = config.icon
  const title = getNotificationTitle(notification.type)
  const href = getNotificationHref(notification)
  const isUnread = !notification.readAt
  const className = [
    'block w-full rounded-xl border p-4 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2',
    isUnread
      ? 'border-pea-100 bg-pea-50 hover:bg-pea-100/70'
      : 'border-gray-100 bg-white hover:bg-gray-50',
  ].join(' ')
  const handleActivate = () => {
    if (isUnread && !isMarkingRead) onRead(notification.id)
  }
  const content = (
    <div className="flex items-start gap-3">
      <span className={['flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', config.bgClass].join(' ')}>
        <Icon className={['h-5 w-5', config.iconClass].join(' ')} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={['text-sm font-medium', isUnread ? 'text-gray-900' : 'text-gray-700'].join(' ')}>
            {title}
          </span>
          {isUnread && (
            <>
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-pea-600" aria-hidden />
              <span className="sr-only">ยังไม่อ่าน</span>
            </>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-gray-500">{notification.message}</span>
        <span className="mt-1.5 block text-xs text-gray-400">
          {formatNotificationDate(notification.createdAt)}
        </span>
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className={className} onClick={handleActivate}>
        {content}
      </Link>
    )
  }

  if (!isUnread) {
    return <article className={className}>{content}</article>
  }

  return (
    <button type="button" className={className} onClick={handleActivate}>
      {content}
    </button>
  )
}

export default function NotificationsPage() {
  const notificationsQuery = useNotifications()
  const unreadCountQuery = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const notifications = notificationsQuery.data ?? []
  const unreadCount = unreadCountQuery.data ?? 0

  return (
    <div className="page-padding mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">การแจ้งเตือน</h1>
        {unreadCount > 0 && (
          <span className="badge border-pea-200 bg-pea-100 text-pea-700">
            {unreadCount} ใหม่
          </span>
        )}
      </div>

      {notificationsQuery.isLoading && (
        <div className="space-y-3" aria-label="กำลังโหลดการแจ้งเตือน">
          {SKELETON_IDS.map((id) => (
            <div key={id} className="card-surface h-20 animate-pulse bg-gray-100 p-4" />
          ))}
        </div>
      )}

      {notificationsQuery.error && (
        <div role="alert" className="card-surface p-6 text-center text-sm text-red-600">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      )}

      {!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length === 0 && (
        <div className="py-16 text-center">
          <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden />
          <p className="font-medium text-gray-500">ไม่มีการแจ้งเตือน</p>
          <p className="mt-1 text-sm text-gray-400">
            ระบบจะแจ้งเมื่อมีงานถึงกำหนด คำขอยืม ข้อคลาดเคลื่อน หรือการมอบหมายใบงาน
          </p>
        </div>
      )}

      {!notificationsQuery.isLoading && !notificationsQuery.error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isMarkingRead={markRead.isPending && markRead.variables === notification.id}
              onRead={(id) => { markRead.mutate(id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
