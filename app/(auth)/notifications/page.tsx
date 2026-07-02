'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell, AlertTriangle, Info, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import type { Notification, NotificationType } from '@/lib/types'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; iconClass: string; bgClass: string }> = {
  REMOVAL_DUE: {
    icon: Clock,
    iconClass: 'text-orange-600',
    bgClass: 'bg-orange-50',
  },
  OVERDUE: {
    icon: AlertTriangle,
    iconClass: 'text-red-600',
    bgClass: 'bg-red-50',
  },
  INFO: {
    icon: Info,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
  },
}

function NotificationItem({ notif }: { notif: Notification }) {
  const config = TYPE_CONFIG[notif.type]
  const Icon = config.icon

  return (
    <div
      className={[
        'flex items-start gap-3 p-4 rounded-xl border transition-colors',
        notif.read
          ? 'bg-white border-gray-100'
          : 'bg-pea-50 border-pea-100',
      ].join(' ')}
    >
      <div className={['w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bgClass].join(' ')}>
        <Icon className={['w-5 h-5', config.iconClass].join(' ')} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={['text-sm font-medium', notif.read ? 'text-gray-700' : 'text-gray-900'].join(' ')}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-pea-600 flex-shrink-0 mt-1.5" aria-label="ยังไม่อ่าน" />
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {new Date(notif.createdAt).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<Notification[]>('/notifications')
      return res.data ?? []
    },
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="page-padding max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900">การแจ้งเตือน</h1>
        {unreadCount > 0 && (
          <span className="badge bg-pea-100 text-pea-700 border-pea-200">
            {unreadCount} ใหม่
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card-surface p-4 h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="card-surface p-6 text-center text-red-600 text-sm">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500 font-medium">ไม่มีการแจ้งเตือน</p>
          <p className="text-gray-400 text-sm mt-1">
            การแจ้งเตือนจะปรากฏเมื่อมีใบงานถึงกำหนด
          </p>
        </div>
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <NotificationItem key={notif.id} notif={notif} />
          ))}
        </div>
      )}
    </div>
  )
}
