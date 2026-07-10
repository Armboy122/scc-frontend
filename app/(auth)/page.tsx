'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPlus, Filter } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WorkOrderCard } from '@/components/feature/WorkOrderCard'
import { Button } from '@/components/ui/Button'
import { getWorkOrderDisplayStatus, type WorkOrderDisplayStatus } from '@/lib/workOrderDisplayStatus'
import type { WorkOrder } from '@/lib/types'

const STATUS_FILTERS: { label: string; value: WorkOrderDisplayStatus | 'ALL' }[] = [
  { label: 'ทั้งหมด', value: 'ALL' },
  { label: 'รอติดตั้ง', value: 'PENDING_INSTALL' },
  { label: 'ติดตั้ง', value: 'INSTALLED' },
  { label: 'ใกล้ครบ', value: 'DUE_SOON' },
  { label: 'ครบกำหนด', value: 'DUE_TODAY' },
  { label: 'เกินกำหนด', value: 'OVERDUE' },
  { label: 'กำลังถอด', value: 'REMOVING' },
  { label: 'เสร็จสิ้น', value: 'COMPLETED' },
  { label: 'ยกเลิก', value: 'CANCELLED' },
]

const URGENT_STATUSES: WorkOrderDisplayStatus[] = ['OVERDUE', 'DUE_TODAY', 'PENDING_INSTALL']

function statusPriority(order: WorkOrder): number {
  const status = getWorkOrderDisplayStatus(order)
  if (status === 'OVERDUE') return 0
  if (status === 'DUE_TODAY') return 1
  if (status === 'PENDING_INSTALL') return 2
  if (status === 'DUE_SOON') return 3
  if (status === 'REMOVING') return 4
  if (status === 'INSTALLED') return 5
  if (status === 'COMPLETED') return 6
  return 7
}

function timestamp(iso?: string): number {
  if (!iso) return Number.MAX_SAFE_INTEGER
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value
}

function sortFieldFirst(a: WorkOrder, b: WorkOrder): number {
  return statusPriority(a) - statusPriority(b)
    || timestamp(a.removalDate) - timestamp(b.removalDate)
    || timestamp(a.installDate) - timestamp(b.installDate)
}

export default function WorkOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<WorkOrderDisplayStatus | 'ALL'>('ALL')

  const params = user?.role === 'tech' ? { mine: true } : undefined
  const { data: allOrders = [], isLoading, error } = useWorkOrders(params)
  const filterCounts = useMemo(() => {
    const counts: Record<WorkOrderDisplayStatus | 'ALL', number> = {
      ALL: allOrders.length,
      PENDING_INSTALL: 0,
      INSTALLED: 0,
      DUE_SOON: 0,
      DUE_TODAY: 0,
      OVERDUE: 0,
      REMOVING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    }
    allOrders.forEach((order) => {
      counts[getWorkOrderDisplayStatus(order)] += 1
    })
    return counts
  }, [allOrders])
  const orders = useMemo(
    () =>
      (statusFilter === 'ALL'
        ? allOrders
        : allOrders.filter((order) => getWorkOrderDisplayStatus(order) === statusFilter)
      ).toSorted(sortFieldFirst),
    [allOrders, statusFilter],
  )
  const urgentOrders = useMemo(
    () => orders.filter((order) => URGENT_STATUSES.includes(getWorkOrderDisplayStatus(order))),
    [orders],
  )
  const otherOrders = useMemo(
    () => orders.filter((order) => !URGENT_STATUSES.includes(getWorkOrderDisplayStatus(order))),
    [orders],
  )

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
              'flex-shrink-0 min-h-11 px-4 py-2.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === f.value
                ? 'bg-pea-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            {f.label} ({filterCounts[f.value]})
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
        <div className="space-y-5">
          {statusFilter === 'ALL' && urgentOrders.length > 0 && (
            <section className="space-y-3" aria-labelledby="urgent-workorders-heading">
              <div>
                <h2 id="urgent-workorders-heading" className="text-base font-bold text-gray-900">
                  ต้องทำวันนี้ / เร่งด่วน
                </h2>
                <p className="text-sm text-gray-600">เกินกำหนด → ครบกำหนด → รอติดตั้ง เรียงให้ทำต่อก่อน</p>
              </div>
              <div className="space-y-3">
                {urgentOrders.map((order) => (
                  <WorkOrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          )}

          {(statusFilter !== 'ALL' || otherOrders.length > 0) && (
            <section className="space-y-3" aria-labelledby="other-workorders-heading">
              {statusFilter === 'ALL' && (
                <div>
                  <h2 id="other-workorders-heading" className="text-base font-bold text-gray-900">
                    งานอื่น ๆ
                  </h2>
                  <p className="text-sm text-gray-600">ใกล้ครบกำหนดและงานติดตั้งที่ยังไม่เร่งด่วน</p>
                </div>
              )}
              <div className="space-y-3">
                {(statusFilter === 'ALL' ? otherOrders : orders).map((order) => (
                  <WorkOrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          )}
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
