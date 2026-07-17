'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
} from 'lucide-react'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { DashboardSummary, WorkOrder } from '@/lib/types'

interface SummaryCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconClass?: string
  bgClass?: string
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass = 'text-pea-600',
  bgClass = 'bg-pea-50',
}: SummaryCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bgClass].join(' ')}>
          <Icon className={['h-5 w-5', iconClass].join(' ')} aria-hidden />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  )
}

function timestamp(iso?: string): number {
  if (!iso) return Number.MAX_SAFE_INTEGER
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value
}

function formatDate(iso?: string): string {
  const value = timestamp(iso)
  if (value === Number.MAX_SAFE_INTEGER) return 'ยังไม่กำหนด'
  return new Date(value).toLocaleDateString('th-TH')
}

function totalStock(summary: DashboardSummary, field: 'inStock' | 'installed'): number {
  return summary.stockByOffice.reduce((total, officeStock) => total + officeStock.stock[field], 0)
}

function DueWorkOrderList({
  orders,
  tone,
}: {
  orders: WorkOrder[]
  tone: 'orange' | 'red'
}) {
  const textClass = tone === 'red' ? 'text-red-900' : 'text-orange-900'
  const dateClass = tone === 'red' ? 'text-red-700' : 'text-orange-700'

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/workorders/${encodeURIComponent(order.id)}`}
            className="flex min-h-11 items-center justify-between rounded-lg px-2 py-1 text-sm transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500"
          >
            <span className={['mr-2 truncate font-medium', textClass].join(' ')}>{order.customerName}</span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <span className={['text-xs tabular-nums', dateClass].join(' ')}>
                {formatDate(order.removalDate)}
              </span>
              <StatusBadge workOrder={order} size="sm" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const LOADING_CARD_IDS = [
  'stock-in',
  'stock-installed',
  'scheduled',
  'active',
  'removal-due',
  'removing',
  'completed',
  'cancelled',
]

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const canView = user?.role === 'admin' || user?.role === 'exec'
  const summaryQuery = useDashboardSummary(canView)

  useEffect(() => {
    if (user && !canView) router.replace('/')
  }, [canView, router, user])

  if (!canView) return null

  const summary = summaryQuery.data
  const status = summary?.workOrdersByStatus
  const metrics = summary?.metrics
  const totalWorkOrders = status
    ? Object.values(status).reduce((total, count) => total + count, 0)
    : 0
  const isEmpty = Boolean(
    summary
    && summary.stockByOffice.length === 0
    && totalWorkOrders === 0
    && summary.dueSoon.length === 0
    && summary.overdueRemovals.length === 0,
  )
  const dueSoon = summary?.dueSoon
    .toSorted((a, b) => timestamp(a.removalDate) - timestamp(b.removalDate)) ?? []
  const overdue = summary?.overdueRemovals
    .toSorted((a, b) => timestamp(a.removalDate) - timestamp(b.removalDate)) ?? []

  return (
    <div className="page-padding mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="mt-0.5 text-sm text-gray-500">ภาพรวมการจัดการฉนวน</p>
      </div>

      {summaryQuery.isLoading && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="กำลังโหลดแดชบอร์ด">
          {LOADING_CARD_IDS.map((id) => (
            <div key={id} className="card-surface h-20 animate-pulse bg-gray-100 p-4" />
          ))}
        </div>
      )}

      {summaryQuery.error && (
        <div role="alert" className="card-surface p-6 text-center text-sm text-red-600">
          ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่
        </div>
      )}

      {!summaryQuery.isLoading && !summaryQuery.error && isEmpty && (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden />
          <p className="font-medium text-gray-500">ยังไม่มีข้อมูลสำหรับสรุป</p>
          <p className="mt-1 text-sm text-gray-400">เมื่อมีสต็อกหรือใบงาน ภาพรวมจะแสดงที่นี่</p>
        </div>
      )}

      {!summaryQuery.isLoading && !summaryQuery.error && summary && !isEmpty && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="ฉนวนในคลัง (ตามที่อยู่จริง)"
              value={totalStock(summary, 'inStock')}
              icon={Package}
              iconClass="text-green-600"
              bgClass="bg-green-50"
            />
            <SummaryCard
              label="ฉนวนติดตั้ง (ตามที่อยู่จริง)"
              value={totalStock(summary, 'installed')}
              icon={CheckCircle2}
              iconClass="text-blue-600"
              bgClass="bg-blue-50"
            />
          </div>

          {metrics && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                กำหนดการติดตาม
              </h2>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard label="ใกล้ครบกำหนดถอด" value={metrics.removalDueSoonCovers} icon={Clock} iconClass="text-orange-600" bgClass="bg-orange-50" />
                <SummaryCard label="เกินกำหนดถอด" value={metrics.removalOverdueCovers} icon={AlertTriangle} iconClass="text-red-600" bgClass="bg-red-50" />
                <SummaryCard label="ใกล้ครบกำหนดคืน" value={metrics.borrowReturnDueSoonCovers} icon={Clock} iconClass="text-amber-600" bgClass="bg-amber-50" />
                <SummaryCard label="เกินกำหนดคืน" value={metrics.borrowReturnOverdueCovers} icon={AlertTriangle} iconClass="text-rose-600" bgClass="bg-rose-50" />
              </div>
              <p className="-mt-4 mb-6 text-xs text-gray-500">
                นับจากฉนวนที่ติดตั้ง/ยืมจริง — ใกล้ครบกำหนดถอด {metrics.removalDueSoonWorkOrders} ใบงาน, ใกล้ครบกำหนดคืน {metrics.borrowReturnDueSoonBorrows} ใบยืม
              </p>
            </>
          )}

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            ใบงานตามสถานะ
          </h2>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="รอติดตั้ง" value={status?.SCHEDULED ?? 0} icon={Clock} iconClass="text-slate-600" bgClass="bg-slate-50" />
            <SummaryCard label="ติดตั้ง" value={status?.ACTIVE ?? 0} icon={CheckCircle2} iconClass="text-green-600" bgClass="bg-green-50" />
            <SummaryCard label="ครบกำหนดถอด" value={status?.REMOVAL_DUE ?? 0} icon={AlertTriangle} iconClass="text-orange-600" bgClass="bg-orange-50" />
            <SummaryCard label="กำลังถอด" value={status?.REMOVING ?? 0} icon={RotateCcw} iconClass="text-violet-600" bgClass="bg-violet-50" />
            <SummaryCard label="เสร็จสิ้น" value={status?.COMPLETED ?? 0} icon={CheckCircle2} iconClass="text-emerald-600" bgClass="bg-emerald-50" />
            <SummaryCard label="ยกเลิก" value={status?.CANCELLED ?? 0} icon={Ban} iconClass="text-gray-600" bgClass="bg-gray-100" />
          </div>

          {overdue.length > 0 && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                เกินกำหนด ({overdue.length} ใบงาน)
              </h2>
              <DueWorkOrderList orders={overdue.slice(0, 5)} tone="red" />
            </Card>
          )}

          {dueSoon.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-800">
                <Clock className="h-4 w-4" aria-hidden />
                ใกล้ครบกำหนด ({dueSoon.length} ใบงาน)
              </h2>
              <DueWorkOrderList orders={dueSoon.slice(0, 8)} tone="orange" />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
