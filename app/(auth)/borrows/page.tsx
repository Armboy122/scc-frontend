'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Handshake, Plus, RefreshCw } from 'lucide-react'
import { useBorrows } from '@/hooks/useBorrows'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { BorrowDirection, BorrowQueryParams, BorrowStatus } from '@/lib/types'
import { formatThaiDate } from '@/lib/thaiDate'

const STATUS_FILTERS: { label: string; value: BorrowStatus | 'ALL' }[] = [
  { label: 'ทั้งหมด', value: 'ALL' },
  { label: 'รออนุมัติ', value: 'REQUESTED' },
  { label: 'อนุมัติแล้ว', value: 'APPROVED' },
  { label: 'ยืมอยู่', value: 'ON_LOAN' },
  { label: 'เกินกำหนด', value: 'OVERDUE' },
  { label: 'คืนแล้ว', value: 'RETURNED' },
  { label: 'ปฏิเสธ', value: 'REJECTED' },
  { label: 'ยกเลิก', value: 'CANCELLED' },
]

const DIRECTION_FILTERS = [
  { label: 'ยืมเข้า', value: 'in' as const, icon: ArrowDownLeft },
  { label: 'ให้ยืมออก', value: 'out' as const, icon: ArrowUpRight },
]

function formatDate(value: string): string {
  if (Number.isNaN(new Date(value).getTime())) return '—'
  return formatThaiDate(value, {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export default function BorrowsPage() {
  const { user } = useAuth()
  const [direction, setDirection] = useState<BorrowDirection>('in')
  const [status, setStatus] = useState<BorrowStatus | 'ALL'>('ALL')
  const isAdmin = user?.role === 'admin'
  const canCreate = user?.role === 'exec' || user?.role === 'tech'
  const query: BorrowQueryParams = {
    ...(!isAdmin ? { direction } : {}),
    ...(status !== 'ALL' ? { status } : {}),
  }
  const {
    data: borrows = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useBorrows(query)

  return (
    <div className="page-padding max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ใบยืมฉนวน</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ทำรายการยืม ส่งมอบ และรับคืนฉนวนระหว่างสำนักงานได้จากทุกอุปกรณ์
          </p>
        </div>
        {canCreate && (
          <Link
            href="/borrows/new"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-pea-600 bg-pea-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-pea-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            สร้างใบยืม
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          ผู้ดูแลระบบเห็นคำขอทุกสำนักงานในโหมดอ่านเป็นหลัก และไม่ใช่ผู้อนุมัติทางธุรกิจ
        </div>
      )}

      {!isAdmin && (
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 mb-3" aria-label="ทิศทางการยืม">
          {DIRECTION_FILTERS.map((item) => {
            const Icon = item.icon
            const active = direction === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setDirection(item.value)}
                className={[
                  'flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  active ? 'bg-pea-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                aria-pressed={active}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide" aria-label="กรองสถานะ">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            className={[
              'flex min-h-11 flex-shrink-0 items-center px-3 rounded-full text-sm font-medium transition-colors',
              status === item.value
                ? 'bg-pea-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300',
            ].join(' ')}
            aria-pressed={status === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2" aria-label="กำลังโหลดใบยืม">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-surface h-40 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div role="alert" className="card-surface p-6 text-center">
          <p className="text-sm font-medium text-red-600">ไม่สามารถโหลดใบยืมได้</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            loading={isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void refetch()}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {!isLoading && !error && borrows.length === 0 && (
        <div className="text-center py-16">
          <Handshake className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500 font-medium">ยังไม่มีใบยืมในมุมมองนี้</p>
          <p className="text-sm text-gray-500 mt-1">เปลี่ยนทิศทางหรือสถานะเพื่อดูรายการอื่นได้</p>
          {canCreate && (
            <Link
              href="/borrows/new"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-pea-600 px-4 text-sm font-medium text-white hover:bg-pea-700"
            >
              สร้างใบยืม
            </Link>
          )}
        </div>
      )}

      {!isLoading && !error && borrows.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {borrows.map((borrow) => (
            <Link
              key={borrow.id}
              href={`/borrows/${borrow.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2"
              aria-label={`เปิดใบยืมจาก ${borrow.lenderOffice.name} ไป ${borrow.borrowerOffice.name}`}
            >
              <Card
                as="article"
                hoverable
                className={borrow.status === 'OVERDUE' ? 'border-red-200 bg-red-50' : ''}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">ผู้ให้ยืม</p>
                    <h2 className="font-semibold text-gray-900 break-words">
                      {borrow.lenderOffice.name}
                    </h2>
                  </div>
                  <StatusBadge borrowStatus={borrow.status} size="sm" />
                </div>

                <div className="my-3 flex min-w-0 items-center gap-2 text-sm text-gray-500">
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-pea-600" aria-hidden />
                  <span className="truncate">ผู้ยืม: {borrow.borrowerOffice.name}</span>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs text-gray-500">จำนวน</dt>
                    <dd className="font-mono font-bold text-lg text-gray-900">
                      {borrow.requestedQty}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">วันที่ขอ</dt>
                    <dd className="font-medium text-gray-800">{formatDate(borrow.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">กำหนดคืน</dt>
                    <dd className="font-medium text-gray-800">{formatDate(borrow.returnDate)}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
