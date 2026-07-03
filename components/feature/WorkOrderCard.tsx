'use client'

import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Package, Phone } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { WorkOrder } from '@/lib/types'

interface WorkOrderCardProps {
  order: WorkOrder
}

function formatDate(iso?: string): string {
  if (!iso) return 'ยังไม่กำหนด'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'ยังไม่กำหนด'
  return date.toLocaleDateString('th-TH', {
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
  const rentalDays = daysBetween(order.installDate, order.removalDate)

  return (
    <article
      onClick={() => router.push(`/workorders/${order.id}`)}
      className={[
        'card-surface p-4 cursor-pointer',
        'transition-shadow duration-150 hover:shadow-card-hover active:scale-[0.99]',
        'animate-fade-in',
      ].join(' ')}
      aria-label={`ใบงาน ${order.customerName}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
            {order.customerName}
          </h3>
          {order.office && (
            <p className="text-xs text-gray-500 mt-0.5">{order.office.name}</p>
          )}
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
                <span className="text-xs text-gray-400 ml-1">({rentalDays}ว.)</span>
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

      {order.note && (
        <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2 line-clamp-2">
          {order.note}
        </p>
      )}
    </article>
  )
}
