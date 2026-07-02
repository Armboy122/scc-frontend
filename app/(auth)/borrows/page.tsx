'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, Handshake, Plus } from 'lucide-react'
import { useBorrows } from '@/hooks/useBorrows'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { BorrowDirection, BorrowStatus } from '@/lib/types'

const STATUS_FILTERS: { label: string; value: BorrowStatus | 'ALL' }[] = [
  { label: 'ทั้งหมด', value: 'ALL' },
  { label: 'รออนุมัติ', value: 'REQUESTED' },
  { label: 'อนุมัติแล้ว', value: 'APPROVED' },
  { label: 'ยืมอยู่', value: 'ON_LOAN' },
  { label: 'เกินกำหนด', value: 'OVERDUE' },
  { label: 'คืนแล้ว', value: 'RETURNED' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}

export default function BorrowsPage() {
  const router = useRouter()
  const [direction, setDirection] = useState<BorrowDirection>('in')
  const [status, setStatus] = useState<BorrowStatus | 'ALL'>('ALL')
  const { data: borrows = [], isLoading, error } = useBorrows({
    direction,
    ...(status !== 'ALL' ? { status } : {}),
  })

  return (
    <div className="page-padding max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ใบยืมฉนวน</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ติดตามคำขอยืม อนุมัติ และคืนฉนวนระหว่างสำนักงาน
          </p>
        </div>
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/borrows/new')}
          className="w-full sm:w-auto"
        >
          สร้างใบยืม
        </Button>
      </div>

      <div className="flex rounded-xl border border-gray-200 bg-white p-1 mb-3">
        {[
          { label: 'ยืมเข้า', value: 'in' as const, icon: ArrowDownLeft },
          { label: 'ให้ยืมออก', value: 'out' as const, icon: ArrowUpRight },
        ].map((item) => {
          const Icon = item.icon
          const active = direction === item.value
          return (
            <button
              key={item.value}
              onClick={() => setDirection(item.value)}
              className={[
                'flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                active ? 'bg-pea-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide" aria-label="กรองสถานะ">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            onClick={() => setStatus(item.value)}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              status === item.value
                ? 'bg-pea-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-surface h-32 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="card-surface p-6 text-center text-red-600 text-sm">
          ไม่สามารถโหลดใบยืมได้
        </div>
      )}

      {!isLoading && !error && borrows.length === 0 && (
        <div className="text-center py-16">
          <Handshake className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500 font-medium">ยังไม่มีใบยืม</p>
          <p className="text-sm text-gray-400 mt-1">สร้างใบยืมเมื่อสต็อกสำนักงานไม่พอใช้งาน</p>
          <Button className="mt-4" onClick={() => router.push('/borrows/new')}>
            สร้างใบยืม
          </Button>
        </div>
      )}

      {!isLoading && !error && borrows.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {borrows.map((borrow) => {
            const fromName = borrow.fromOffice?.name ?? borrow.fromOfficeId ?? 'สำนักงานต้นทาง'
            const toName = borrow.toOffice?.name ?? borrow.toOfficeId ?? 'สำนักงานปลายทาง'
            return (
              <Card
                key={borrow.id}
                hoverable
                onClick={() => router.push(`/borrows/${borrow.id}`)}
                className={borrow.status === 'OVERDUE' ? 'border-red-200 bg-red-50' : ''}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">
                      {direction === 'in' ? 'ยืมจาก' : 'ให้ยืมแก่'}
                    </p>
                    <h2 className="font-semibold text-gray-900 truncate">
                      {direction === 'in' ? fromName : toName}
                    </h2>
                  </div>
                  <StatusBadge borrowStatus={borrow.status} size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">จำนวน</p>
                    <p className="font-mono font-bold text-lg text-gray-900">{borrow.qty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ยืม</p>
                    <p className="font-medium text-gray-800">{formatDate(borrow.borrowDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">คืน</p>
                    <p className="font-medium text-gray-800">{formatDate(borrow.returnDate)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 font-mono truncate">{borrow.id}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
