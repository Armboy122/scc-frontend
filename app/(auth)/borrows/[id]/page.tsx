'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Handshake, Package, Route } from 'lucide-react'
import { useBorrow, useBorrowAction } from '@/hooks/useBorrows'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Borrow, BorrowStatus } from '@/lib/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
    </div>
  )
}

function BorrowActions({ borrow }: { borrow: Borrow }) {
  const approve = useBorrowAction('approve')
  const reject = useBorrowAction('reject')
  const cancel = useBorrowAction('cancel')
  const activate = useBorrowAction('activate')
  const returnBorrow = useBorrowAction('return')

  const pending =
    approve.isPending ||
    reject.isPending ||
    cancel.isPending ||
    activate.isPending ||
    returnBorrow.isPending

  const run = async (status: BorrowStatus, action: () => Promise<unknown>) => {
    if (borrow.status !== status) return
    await action()
  }

  if (borrow.status === 'REQUESTED') {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          size="lg"
          loading={cancel.isPending}
          disabled={pending}
          onClick={() => void run('REQUESTED', () => cancel.mutateAsync(borrow.id))}
        >
          ยกเลิกคำขอ
        </Button>
        <Button
          variant="danger"
          size="lg"
          loading={reject.isPending}
          disabled={pending}
          onClick={() => void run('REQUESTED', () => reject.mutateAsync(borrow.id))}
        >
          ปฏิเสธ
        </Button>
        <Button
          size="lg"
          loading={approve.isPending}
          disabled={pending}
          onClick={() => void run('REQUESTED', () => approve.mutateAsync(borrow.id))}
        >
          อนุมัติ
        </Button>
      </div>
    )
  }

  if (borrow.status === 'APPROVED') {
    return (
      <Button
        size="lg"
        fullWidth
        loading={activate.isPending}
        disabled={pending}
        onClick={() => void run('APPROVED', () => activate.mutateAsync(borrow.id))}
      >
        รับเข้าคลังชั่วคราว
      </Button>
    )
  }

  if (borrow.status === 'ON_LOAN' || borrow.status === 'OVERDUE') {
    return (
      <Button
        size="lg"
        fullWidth
        variant={borrow.status === 'OVERDUE' ? 'danger' : 'secondary'}
        loading={returnBorrow.isPending}
        disabled={pending}
        onClick={() => void returnBorrow.mutateAsync(borrow.id)}
      >
        บันทึกคืนฉนวน
      </Button>
    )
  }

  return null
}

export default function BorrowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: borrow, isLoading, error } = useBorrow(id)

  if (isLoading) {
    return (
      <div className="page-padding max-w-2xl mx-auto space-y-3">
        <div className="h-8 w-36 rounded-lg bg-gray-200 animate-pulse" />
        <div className="card-surface h-64 animate-pulse bg-gray-100" />
      </div>
    )
  }

  if (error || !borrow) {
    return (
      <div className="page-padding max-w-lg mx-auto text-center py-16">
        <Handshake className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
        <p className="text-red-600 font-medium">ไม่พบใบยืม</p>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          ย้อนกลับ
        </Button>
      </div>
    )
  }

  const fromName = borrow.fromOffice?.name ?? borrow.fromOfficeId ?? 'สำนักงานต้นทาง'
  const toName = borrow.toOffice?.name ?? borrow.toOfficeId ?? 'สำนักงานปลายทาง'

  return (
    <div className="page-padding max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">รายละเอียดใบยืม</h1>
          <p className="text-xs text-gray-400 font-mono truncate">{borrow.id}</p>
        </div>
        <StatusBadge borrowStatus={borrow.status} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">จาก</p>
            <p className="font-semibold text-gray-900 truncate">{fromName}</p>
          </div>
          <Route className="w-5 h-5 text-pea-600 flex-shrink-0" aria-hidden />
          <div className="min-w-0 text-right">
            <p className="text-xs text-gray-500">ไปยัง</p>
            <p className="font-semibold text-gray-900 truncate">{toName}</p>
          </div>
        </div>

        <dl>
          <DetailRow
            label="จำนวน"
            value={
              <span className="font-mono text-lg font-bold">
                {borrow.qty} <span className="text-sm font-sans font-medium">ชิ้น</span>
              </span>
            }
          />
          <DetailRow
            label="วันไปยืม"
            value={
              <span className="inline-flex items-center justify-end gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" aria-hidden />
                {formatDate(borrow.borrowDate)}
              </span>
            }
          />
          <DetailRow
            label="วันคืน"
            value={
              <span className="inline-flex items-center justify-end gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" aria-hidden />
                {formatDate(borrow.returnDate)}
              </span>
            }
          />
          {borrow.covers && borrow.covers.length > 0 && (
            <DetailRow
              label="ฉนวน"
              value={
                <span className="font-mono text-xs">
                  {borrow.covers.map((cover) => cover.assetCode).join(', ')}
                </span>
              }
            />
          )}
        </dl>
      </Card>

      <Card className="bg-gray-50">
        <div className="flex gap-3">
          <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden />
          <p className="text-sm text-gray-600">
            เมื่ออนุมัติและรับเข้าคลัง ระบบจะย้ายสำนักงานปัจจุบันของฉนวนไปยังผู้ยืมชั่วคราว
            และสถานะคืนจะใช้ติดตามของที่ครบกำหนดหรือเกินกำหนด
          </p>
        </div>
      </Card>

      <BorrowActions borrow={borrow} />
    </div>
  )
}
