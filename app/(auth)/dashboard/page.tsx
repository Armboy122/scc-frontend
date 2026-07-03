'use client'

import { AlertTriangle, CheckCircle2, Clock, Package } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useStock } from '@/hooks/useStock'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { WorkOrder } from '@/lib/types'
import { getWorkOrderDisplayStatus } from '@/lib/workOrderDisplayStatus'

interface SummaryCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconClass?: string
  bgClass?: string
}

function SummaryCard({ label, value, icon: Icon, iconClass = 'text-pea-600', bgClass = 'bg-pea-50' }: SummaryCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bgClass].join(' ')}>
          <Icon className={['w-5 h-5', iconClass].join(' ')} aria-hidden />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </Card>
  )
}

function timestamp(iso?: string): number | null {
  if (!iso) return null
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? null : value
}

function formatDate(iso?: string): string {
  const value = timestamp(iso)
  if (value === null) return 'ยังไม่กำหนด'
  return new Date(value).toLocaleDateString('th-TH')
}

export default function DashboardPage() {
  const { data: allOrders = [], isLoading: ordersLoading } = useWorkOrders()
  const { data: stock = [], isLoading: stockLoading } = useStock()

  const isLoading = ordersLoading || stockLoading

  const pendingInstall = allOrders.filter((o) => getWorkOrderDisplayStatus(o) === 'PENDING_INSTALL').length
  const installed = allOrders.filter((o) => getWorkOrderDisplayStatus(o) === 'INSTALLED').length
  const dueSoonCount = allOrders.filter((o) => getWorkOrderDisplayStatus(o) === 'DUE_SOON').length
  const dueTodayCount = allOrders.filter((o) => getWorkOrderDisplayStatus(o) === 'DUE_TODAY').length
  const overdueCount = allOrders.filter((o) => getWorkOrderDisplayStatus(o) === 'OVERDUE').length

  const totalStock = stock.reduce((s, r) => s + r.inStock, 0)
  const totalInstalled = stock.reduce((s, r) => s + r.installed, 0)

  const dueSoon: WorkOrder[] = allOrders
    .filter((o) => getWorkOrderDisplayStatus(o) === 'DUE_SOON' || getWorkOrderDisplayStatus(o) === 'DUE_TODAY')
    .sort((a, b) => (timestamp(a.removalDate) ?? 0) - (timestamp(b.removalDate) ?? 0))

  const overdue: WorkOrder[] = allOrders
    .filter((o) => getWorkOrderDisplayStatus(o) === 'OVERDUE')
    .sort((a, b) => (timestamp(a.removalDate) ?? 0) - (timestamp(b.removalDate) ?? 0))

  const now = Date.now()

  return (
    <div className="page-padding max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-sm text-gray-500 mt-0.5">ภาพรวมการจัดการฉนวน</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-surface p-4 h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Stock summary */}
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <SummaryCard
              label="ฉนวนในคลัง (รวม)"
              value={totalStock}
              icon={Package}
              iconClass="text-green-600"
              bgClass="bg-green-50"
            />
            <SummaryCard
              label="ฉนวนติดตั้งอยู่"
              value={totalInstalled}
              icon={CheckCircle2}
              iconClass="text-blue-600"
              bgClass="bg-blue-50"
            />
          </div>

          {/* Work order summary */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            ใบงานตามสถานะ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            <SummaryCard label="รอติดตั้ง" value={pendingInstall} icon={Clock} iconClass="text-slate-600" bgClass="bg-slate-50" />
            <SummaryCard label="ติดตั้ง" value={installed} icon={CheckCircle2} iconClass="text-green-600" bgClass="bg-green-50" />
            <SummaryCard label="ใกล้ครบ" value={dueSoonCount} icon={Clock} iconClass="text-orange-600" bgClass="bg-orange-50" />
            <SummaryCard label="ครบกำหนด" value={dueTodayCount} icon={AlertTriangle} iconClass="text-amber-600" bgClass="bg-amber-50" />
            <SummaryCard label="เกินกำหนด" value={overdueCount} icon={AlertTriangle} iconClass="text-red-600" bgClass="bg-red-50" />
          </div>

          {/* Overdue */}
          {overdue.length > 0 && (
            <Card className="border-red-200 bg-red-50 mb-4">
              <h2 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" aria-hidden />
                เกินกำหนด ({overdue.length} ใบงาน)
              </h2>
              <ul className="space-y-2">
                {overdue.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-red-900 truncate mr-2">{o.customerName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-red-700 tabular-nums">
                        {formatDate(o.removalDate)}
                      </span>
                      <StatusBadge workOrder={o} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Due soon */}
          {dueSoon.length > 0 && (
            <Card className="border-orange-200">
              <h2 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" aria-hidden />
                ใกล้ครบ/ครบกำหนด ({dueSoon.length} ใบงาน)
              </h2>
              <ul className="space-y-2">
                {dueSoon.slice(0, 8).map((o) => {
                  const removalTime = timestamp(o.removalDate) ?? now
                  const daysLeft = Math.round((removalTime - now) / 86_400_000)
                  return (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800 truncate mr-2">{o.customerName}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-orange-700 tabular-nums font-medium">
                          {daysLeft <= 0 ? 'วันนี้' : `${daysLeft} วัน`}
                        </span>
                        <StatusBadge workOrder={o} size="sm" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
