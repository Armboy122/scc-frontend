'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Package, Phone, Route, Wrench } from 'lucide-react'
import { useStartRemoval } from '@/hooks/useWorkOrders'
import { useAuth } from '@/lib/auth'
import { getWorkOrderDisplayStatus } from '@/lib/workOrderDisplayStatus'
import { formatThaiDate } from '@/lib/thaiDate'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import type { WorkOrder } from '@/lib/types'

interface WorkOrderCardProps {
  order: WorkOrder
}

function formatDate(iso?: string): string {
  return formatThaiDate(iso, {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.round((end - start) / 86_400_000)
}

export function WorkOrderCard({ order }: WorkOrderCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const startRemovalMutation = useStartRemoval()
  const rentalDays = daysBetween(order.installDate, order.removalDate)
  const displayStatus = getWorkOrderDisplayStatus(order)
  const isTech = user?.role === 'tech'
  const canStartInstall = isTech && order.status === 'SCHEDULED'
  const canStartRemoval = isTech && (displayStatus === 'DUE_TODAY' || displayStatus === 'OVERDUE' || order.status === 'REMOVING') && order.status !== 'COMPLETED'
  const mapsHref = order.latitude && order.longitude
    ? `https://maps.google.com/?q=${order.latitude},${order.longitude}`
    : null
  const shouldShowNavigation = Boolean(mapsHref && (displayStatus === 'DUE_TODAY' || displayStatus === 'OVERDUE'))

  const handlePrimaryAction = async () => {
    if (canStartInstall) {
      router.push(`/workorders/${order.id}/install`)
      return
    }
    if (order.status === 'REMOVING') {
      router.push(`/workorders/${order.id}/remove`)
      return
    }
    if (canStartRemoval) {
      await startRemovalMutation.mutateAsync(order.id)
      router.refresh()
      router.push(`/workorders/${order.id}/remove`)
    }
  }

  return (
    <article
      className={[
        'card-surface relative p-4',
        'transition-shadow duration-150 hover:shadow-card-hover',
        'animate-fade-in',
      ].join(' ')}
    >
      <Link
        href={`/workorders/${order.id}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-600 focus-visible:ring-offset-2"
        aria-label={`เปิดรายละเอียดใบงาน ${order.customerName}`}
      >
        <span className="sr-only">เปิดรายละเอียดใบงาน {order.customerName}</span>
      </Link>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
            {order.customerName}
          </h3>
          {order.office && (
            <p className="text-xs text-gray-500 mt-0.5">{order.office.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-600">{order.usageType === 'INTERNAL' ? 'ใช้งานภายใน' : 'งานครอบให้ผู้ใช้ไฟฟ้า'}</p>
        </div>
        <StatusBadge workOrder={order} size="sm" />
      </div>

      {/* Info row */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
          <div>
            <dt className="sr-only">วันติดตั้ง</dt>
            <dd>{formatDate(order.installDate)}</dd>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" aria-hidden />
          <div>
            <dt className="sr-only">วันถอด</dt>
            <dd>
              {formatDate(order.removalDate)}
              {rentalDays !== null && (
                <span className="text-xs text-gray-500 ml-1">({rentalDays}ว.)</span>
              )}
            </dd>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-600">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
          <div>
            <dt className="sr-only">จำนวน</dt>
            <dd>
              {order.actualQty !== undefined
                ? `${order.actualQty} / ${order.plannedQty}`
                : order.plannedQty}{' '}
              ชิ้น
            </dd>
          </div>
        </div>

        {order.customerPhone && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
            <div>
              <dt className="sr-only">เบอร์โทร</dt>
              <dd className="truncate">{order.customerPhone}</dd>
            </div>
          </div>
        )}

        {order.latitude && order.longitude && (
          <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
            <dt className="sr-only">ตำแหน่ง GPS</dt>
            <dd className="text-xs tabular-nums">
              {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
            </dd>
          </div>
        )}
      </dl>

      {(canStartInstall || canStartRemoval || shouldShowNavigation) && (
        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          {shouldShowNavigation && mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-pea-200 bg-white px-3 text-sm font-medium text-pea-700 transition-colors hover:bg-pea-50"
            >
              <Route className="h-4 w-4" aria-hidden />
              นำทาง
            </a>
          )}
          {(canStartInstall || canStartRemoval) && (
            <Button
              type="button"
              size="md"
              fullWidth
              loading={startRemovalMutation.isPending}
              onClick={() => void handlePrimaryAction()}
              leftIcon={<Wrench className="h-4 w-4" />}
              className="relative z-10 min-h-11 flex-1"
            >
              {canStartInstall ? 'เริ่มติดตั้ง' : order.status === 'REMOVING' ? 'ถอดต่อ' : 'เริ่มถอด'}
            </Button>
          )}
        </div>
      )}

      {order.note && (
        <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2 line-clamp-2">
          {order.note}
        </p>
      )}
    </article>
  )
}
