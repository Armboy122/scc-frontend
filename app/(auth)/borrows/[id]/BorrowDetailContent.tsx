'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Handshake,
  Package,
  RefreshCw,
  Route,
} from 'lucide-react'
import { useBorrow, useBorrowAction } from '@/hooks/useBorrows'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  getBorrowActionPermissions,
  getBorrowReadOnlyMessage,
  type BorrowAction,
  type BorrowActionPermission,
} from '@/lib/borrowPresentation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Textarea } from '@/components/ui/Textarea'
import type { Borrow } from '@/lib/types'

const ACTION_LABEL: Record<BorrowAction, string> = {
  approve: 'อนุมัติคำขอ',
  reject: 'ปฏิเสธคำขอ',
  cancel: 'ยกเลิกคำขอ',
  activate: 'ยืนยันส่งมอบฉนวน',
  return: 'ยืนยันรับคืนฉนวน',
}

const ACTION_VARIANT = {
  approve: 'primary',
  reject: 'danger',
  cancel: 'outline',
  activate: 'primary',
  return: 'secondary',
} as const

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-gray-900 sm:max-w-[65%] sm:text-right">
        {value}
      </dd>
    </div>
  )
}

function reasonLabel(permission: BorrowActionPermission): string {
  return permission.reason === 'required' ? 'เหตุผล (จำเป็น)' : 'เหตุผล (ไม่บังคับ)'
}

function BorrowActions({ borrow }: { borrow: Borrow }) {
  const { user } = useAuth()
  const approve = useBorrowAction('approve')
  const reject = useBorrowAction('reject')
  const cancel = useBorrowAction('cancel')
  const activate = useBorrowAction('activate')
  const returnBorrow = useBorrowAction('return')
  const [selectedAction, setSelectedAction] = useState<BorrowAction | null>(null)
  const [lastAction, setLastAction] = useState<BorrowAction | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const permissions = getBorrowActionPermissions(borrow, user)
  const mutations = {
    approve,
    reject,
    cancel,
    activate,
    return: returnBorrow,
  }
  const pending = Object.values(mutations).some((mutation) => mutation.isPending)
  const mutationError = lastAction ? mutations[lastAction].error : null
  const selectedPermission = permissions.find((item) => item.action === selectedAction)

  const execute = async (permission: BorrowActionPermission) => {
    const normalizedReason = permission.reason === 'none' ? '' : reason.trim()
    if (permission.reason === 'required' && !normalizedReason) {
      setReasonError('กรุณาระบุเหตุผลเพื่อบันทึกในประวัติการดำเนินการ')
      return
    }

    setReasonError(null)
    setLastAction(permission.action)
    try {
      await mutations[permission.action].mutateAsync({
        id: borrow.id,
        ...(normalizedReason ? { reason: normalizedReason } : {}),
      })
      setSelectedAction(null)
      setLastAction(null)
      setReason('')
    } catch {
      // The mutation error is rendered below the action controls.
    }
  }

  const chooseAction = (permission: BorrowActionPermission) => {
    if (permission.reason === 'none') {
      setSelectedAction(null)
      setReason('')
      void execute(permission)
      return
    }

    setSelectedAction(permission.action)
    setLastAction(null)
    setReason('')
    setReasonError(null)
  }

  if (permissions.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <p className="text-sm font-medium text-blue-900">
          {getBorrowReadOnlyMessage(borrow, user?.role)}
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">การดำเนินการ</h2>
      <p className="mt-1 text-sm text-gray-500">
        ระบบฝั่งเซิร์ฟเวอร์จะตรวจบทบาท สำนักงาน และสถานะซ้ำก่อนเปลี่ยนข้อมูลทุกครั้ง
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {permissions.map((permission) => (
          <Button
            key={permission.action}
            type="button"
            size="lg"
            variant={ACTION_VARIANT[permission.action]}
            loading={mutations[permission.action].isPending}
            disabled={pending}
            onClick={() => chooseAction(permission)}
          >
            {ACTION_LABEL[permission.action]}
          </Button>
        ))}
      </div>

      {selectedPermission && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Textarea
            label={reasonLabel(selectedPermission)}
            required={selectedPermission.reason === 'required'}
            value={reason}
            error={reasonError ?? undefined}
            disabled={pending}
            maxLength={500}
            placeholder="ระบุเหตุผลที่ตรวจสอบย้อนหลังได้"
            onChange={(event) => {
              setReason(event.target.value)
              if (reasonError) setReasonError(null)
            }}
          />
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSelectedAction(null)
                setReason('')
                setReasonError(null)
              }}
            >
              กลับ
            </Button>
            <Button
              type="button"
              variant={ACTION_VARIANT[selectedPermission.action]}
              loading={mutations[selectedPermission.action].isPending}
              disabled={pending}
              onClick={() => void execute(selectedPermission)}
            >
              ยืนยันการดำเนินการ
            </Button>
          </div>
        </div>
      )}

      {mutationError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {mutationError instanceof ApiError
            ? mutationError.message
            : 'ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสถานะล่าสุดแล้วลองอีกครั้ง'}
        </p>
      )}
    </Card>
  )
}

export function BorrowDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const { data: borrow, isLoading, isFetching, error, refetch } = useBorrow(id)

  if (isLoading) {
    return (
      <div className="page-padding max-w-2xl mx-auto space-y-3" aria-label="กำลังโหลดรายละเอียดใบยืม">
        <div className="h-8 w-36 rounded-lg bg-gray-200 animate-pulse" />
        <div className="card-surface h-64 animate-pulse bg-gray-100" />
      </div>
    )
  }

  if (error || !borrow) {
    return (
      <div className="page-padding max-w-lg mx-auto text-center py-16">
        <Handshake className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
        <p role="alert" className="text-red-600 font-medium">
          ไม่สามารถโหลดรายละเอียดใบยืมได้
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            loading={isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void refetch()}
          >
            ลองอีกครั้ง
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            ย้อนกลับ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-padding max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">รายละเอียดใบยืม</h1>
        </div>
        <StatusBadge borrowStatus={borrow.status} />
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ผู้ให้ยืม</p>
            <p className="font-semibold text-gray-900 break-words">{borrow.lenderOffice.name}</p>
          </div>
          <Route className="hidden w-5 h-5 text-pea-600 sm:block" aria-hidden />
          <div className="min-w-0 sm:text-right">
            <p className="text-xs text-gray-500">ผู้ยืม</p>
            <p className="font-semibold text-gray-900 break-words">{borrow.borrowerOffice.name}</p>
          </div>
        </div>

        <dl className="mt-4">
          <DetailRow
            label="จำนวนที่ขอ"
            value={(
              <span className="font-mono text-lg font-bold">
                {borrow.requestedQty} <span className="text-sm font-sans font-medium">ชิ้น</span>
              </span>
            )}
          />
          <DetailRow
            label="วันที่ส่งคำขอ"
            value={(
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" aria-hidden />
                {formatDateTime(borrow.createdAt)}
              </span>
            )}
          />
          <DetailRow
            label="กำหนดคืน"
            value={(
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" aria-hidden />
                {formatDateTime(borrow.returnDate)}
              </span>
            )}
          />
          {borrow.activatedAt && (
            <DetailRow label="ส่งมอบจริง" value={formatDateTime(borrow.activatedAt)} />
          )}
          {borrow.returnedAt && (
            <DetailRow label="รับคืนจริง" value={formatDateTime(borrow.returnedAt)} />
          )}
          {borrow.note && <DetailRow label="หมายเหตุ" value={borrow.note} />}
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">ฉนวนที่ระบบจอง</h2>
            <p className="text-sm text-gray-500">แสดงเฉพาะรหัสทรัพย์สินและสถานะ</p>
          </div>
          <span className="font-mono text-lg font-bold text-gray-900">{borrow.covers.length}</span>
        </div>

        {borrow.covers.length === 0 ? (
          <p className="mt-4 rounded-xl bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
            ยังไม่มีรายการฉนวนจากเซิร์ฟเวอร์
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {borrow.covers.map((cover) => (
              <li key={cover.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-gray-900">
                    {cover.assetCode}
                  </p>
                </div>
                <StatusBadge coverStatus={cover.status} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="bg-gray-50">
        <div className="flex gap-3">
          {borrow.status === 'RETURNED' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden />
          ) : (
            <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden />
          )}
          <p className="text-sm text-gray-600">
            การอนุมัติยังไม่ย้ายสต็อกจริง สต็อกจะย้ายเมื่อผู้ให้ยืมยืนยันส่งมอบ
            และจะย้ายกลับเมื่อผู้ให้ยืมยืนยันรับคืนครบทุกชิ้น
          </p>
        </div>
      </Card>

      <BorrowActions borrow={borrow} />
    </div>
  )
}
