'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPlus, Filter } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WorkOrderCard } from '@/components/feature/WorkOrderCard'
import { Button } from '@/components/ui/Button'
import type { WorkOrderStatus } from '@/lib/types'

const STATUS_FILTERS: { label: string; value: WorkOrderStatus | 'ALL' }[] = [
  { label: 'ทั้งหมด',       value: 'ALL' },
  { label: 'รอดำเนินการ',   value: 'SCHEDULED' },
  { label: 'กำลังติดตั้ง',  value: 'INSTALLING' },
  { label: 'ใช้งานอยู่',    value: 'ACTIVE' },
  { label: 'ถึงกำหนดถอด',  value: 'REMOVAL_DUE' },
  { label: 'กำลังถอด',      value: 'REMOVING' },
  { label: 'เสร็จสิ้น',     value: 'COMPLETED' },
]

export default function WorkOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL')

  const params =
    statusFilter === 'ALL'
      ? user?.role === 'tech'
        ? { assignedTo: user.id }
        : undefined
      : {
          status: statusFilter,
          ...(user?.role === 'tech' ? { assignedTo: user.id } : {}),
        }

  const { data: orders = [], isLoading, error } = useWorkOrders(params)

  const canCreate = user?.role === 'exec' || user?.role === 'admin' || user?.role === 'tech'

  return (
    <div className="page-padding max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ใบงาน</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-0.5">
              {user.office?.name ?? ''}
            </p>
          )}
        </div>
        {canCreate && (
          <Button
            size="md"
            leftIcon={<ClipboardPlus className="w-4 h-4" />}
            onClick={() => router.push('/workorders/new')}
            className="w-full sm:w-auto"
          >
            สร้างใบงาน
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide"
        role="tablist"
        aria-label="กรองสถานะ"
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === f.value
                ? 'bg-pea-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-surface p-4 h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="card-surface p-6 text-center text-red-600 text-sm"
        >
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16">
          <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500 font-medium">ยังไม่มีใบงาน</p>
          <p className="text-gray-400 text-sm mt-1">
            {statusFilter !== 'ALL' ? 'ลองเปลี่ยนตัวกรองสถานะ' : 'ยังไม่มีใบงานในระบบ'}
          </p>
          {canCreate && (
            <Button
              className="mt-4"
              size="md"
              onClick={() => router.push('/workorders/new')}
              leftIcon={<ClipboardPlus className="w-4 h-4" />}
            >
              สร้างใบงานแรก
            </Button>
          )}
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <WorkOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      {canCreate && (
        <button
          onClick={() => router.push('/workorders/new')}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-pea-600 text-white shadow-lg flex items-center justify-center hover:bg-pea-700 active:scale-95 transition-all"
          aria-label="สร้างใบงาน"
        >
          <ClipboardPlus className="w-6 h-6" aria-hidden />
        </button>
      )}
    </div>
  )
}
