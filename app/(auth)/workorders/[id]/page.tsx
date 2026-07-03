'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Phone,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useWorkOrder, useCancelWorkOrder, useStartRemoval } from '@/hooks/useWorkOrders'
import { useAuth } from '@/lib/auth'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { WorkOrder } from '@/lib/types'

function formatDate(iso?: string) {
  if (!iso) return 'ยังไม่กำหนด'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'ยังไม่กำหนด'
  return date.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.round((end - start) / 86_400_000)
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 mt-0.5">{value}</dd>
      </div>
    </div>
  )
}

function ActionButtons({ order }: { order: WorkOrder }) {
  const router = useRouter()
  const { user } = useAuth()
  const cancelMutation = useCancelWorkOrder()
  const startRemovalMutation = useStartRemoval()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isTech = user?.role === 'tech'
  const canCancel = user?.role === 'exec'

  return (
    <div className="space-y-3">
      {order.status === 'SCHEDULED' && (
        <>
          {isTech && (
            <Button
              size="xl"
              fullWidth
              leftIcon={<Wrench className="w-5 h-5" />}
              onClick={() => router.push(`/workorders/${order.id}/install`)}
            >
              ดำเนินการติดตั้ง
            </Button>
          )}
          {canCancel && (!confirmCancel ? (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              leftIcon={<XCircle className="w-5 h-5" />}
              onClick={() => setConfirmCancel(true)}
            >
              ยกเลิกใบงาน
            </Button>
          ) : (
            <div className="card-surface p-4 bg-red-50 border-red-200 space-y-3">
              <p className="text-sm font-medium text-red-800 text-center">
                ยืนยันการยกเลิกใบงาน? ระบบจะคงใบงานไว้และเปลี่ยนสถานะเป็นยกเลิก
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setConfirmCancel(false)}
                >
                  กลับ
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  className="flex-1"
                  loading={cancelMutation.isPending}
                  onClick={async () => {
                    await cancelMutation.mutateAsync(order.id)
                    setConfirmCancel(false)
                  }}
                >
                  ยืนยันยกเลิก
                </Button>
              </div>
            </div>
          ))}
        </>
      )}

      {order.status === 'INSTALLING' && (
        <Button
          size="xl"
          fullWidth
          leftIcon={<Wrench className="w-5 h-5" />}
          onClick={() => router.push(`/workorders/${order.id}/install`)}
        >
          ดำเนินการติดตั้ง
        </Button>
      )}

      {(order.status === 'ACTIVE' || order.status === 'REMOVAL_DUE') && isTech && (
        <Button
          size="xl"
          fullWidth
          variant="secondary"
          leftIcon={<Wrench className="w-5 h-5" />}
          loading={startRemovalMutation.isPending}
          onClick={async () => {
            await startRemovalMutation.mutateAsync(order.id)
            router.refresh()
            router.push(`/workorders/${order.id}/remove`)
          }}
        >
          เริ่มถอดฉนวน
        </Button>
      )}

      {order.status === 'REMOVING' && (
        <Button
          size="xl"
          fullWidth
          variant="secondary"
          onClick={() => router.push(`/workorders/${order.id}/remove`)}
        >
          ถอดฉนวน
        </Button>
      )}
    </div>
  )
}

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: order, isLoading, error } = useWorkOrder(id)

  if (isLoading) {
    return (
      <div className="page-padding max-w-lg mx-auto space-y-3">
        <div className="h-8 w-32 rounded-lg bg-gray-200 animate-pulse" />
        <div className="card-surface p-4 h-48 animate-pulse bg-gray-100" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="page-padding max-w-lg mx-auto text-center py-16">
        <p className="text-red-600 font-medium">ไม่พบใบงาน</p>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          ย้อนกลับ
        </Button>
      </div>
    )
  }

  const rentalDays = daysBetween(order.installDate, order.removalDate)

  return (
    <div className="page-padding max-w-lg mx-auto space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{order.customerName}</h1>
        </div>
        <StatusBadge workOrder={order} />
      </div>

      {/* Info card */}
      <Card>
        <dl>
          <InfoRow
            icon={Calendar}
            label="วันติดตั้ง"
            value={`${formatDate(order.installDate)}`}
          />
          <InfoRow
            icon={Calendar}
            label="วันถอด"
            value={
              rentalDays !== null
                ? `${formatDate(order.removalDate)} (${rentalDays} วัน)`
                : formatDate(order.removalDate)
            }
          />
          <InfoRow
            icon={Package}
            label="จำนวนฉนวน"
            value={
              order.actualQty !== undefined
                ? `${order.actualQty} / ${order.plannedQty} ชิ้น`
                : `${order.plannedQty} ชิ้น`
            }
          />
          {order.customerPhone && (
            <InfoRow icon={Phone} label="เบอร์โทร" value={order.customerPhone} />
          )}
          {order.office && (
            <InfoRow icon={Package} label="สำนักงาน" value={order.office.name} />
          )}
          {order.latitude && order.longitude && (
            <InfoRow
              icon={MapPin}
              label="ตำแหน่ง GPS"
              value={
                <a
                  href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pea-600 underline underline-offset-2"
                >
                  {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
                </a>
              }
            />
          )}
        </dl>
        {order.note && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">หมายเหตุ</p>
            <p className="text-sm text-gray-700">{order.note}</p>
          </div>
        )}
      </Card>

      {/* Installed covers */}
      {order.installations && order.installations.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            ฉนวนที่ติดตั้ง ({order.installations.length} ชิ้น)
          </h2>
          <ul className="space-y-2">
            {order.installations.map((inst, i) => (
              <li
                key={inst.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <span className="w-5 h-5 rounded-full bg-pea-100 text-pea-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-mono">{inst.cover?.assetCode ?? inst.coverId}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Action buttons */}
      <ActionButtons order={order} />
    </div>
  )
}
