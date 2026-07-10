'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardPlus, Hash, Link2 } from 'lucide-react'
import { DiscrepancyStockNotice } from '@/components/feature/DiscrepancyStockNotice'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCreateDiscrepancy } from '@/hooks/useDiscrepancies'
import { useOffices } from '@/hooks/useOffices'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { MANUAL_DISCREPANCY_OPTIONS } from '@/lib/discrepancyPresentation'
import type { CreateDiscrepancyRequest, ManualDiscrepancyType } from '@/lib/types'

function optionalQuantity(value: string, label: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`)
  }
  return parsed
}

function optionalReference(value: string): string | undefined {
  const normalized = value.trim()
  return normalized || undefined
}

export default function NewDiscrepancyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const createDiscrepancy = useCreateDiscrepancy()
  const isAdmin = user?.role === 'admin'
  const officesQuery = useOffices(isAdmin)
  const canReport = Boolean(
    isAdmin || (user?.officeId && (user.role === 'exec' || user.role === 'tech')),
  )
  const officeLabel = isAdmin
    ? 'เลือกสำนักงานที่พบเหตุการณ์ในแบบฟอร์ม'
    : user?.office?.name ?? user?.officeId ?? 'ไม่พบสำนักงาน'
  const officeOptions = useMemo(() => [...(officesQuery.data ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    .map((office) => ({ value: office.id, label: office.name })), [officesQuery.data])
  const [type, setType] = useState<ManualDiscrepancyType>('UNEXPECTED_COVER')
  const [officeId, setOfficeId] = useState('')
  const [reason, setReason] = useState('')
  const [expectedQty, setExpectedQty] = useState('')
  const [observedQty, setObservedQty] = useState('')
  const [coverId, setCoverId] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [borrowId, setBorrowId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!canReport) {
    return (
      <div className="page-padding mx-auto max-w-xl space-y-4">
        <Link href="/discrepancies" className="inline-flex items-center gap-2 text-sm font-medium text-pea-700 hover:text-pea-800">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          กลับไปหน้าข้อคลาดเคลื่อน
        </Link>
        <Card className="border-blue-200 bg-blue-50">
          <h1 className="font-semibold text-blue-950">หน้านี้สำหรับสำนักงานผู้รายงาน</h1>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            บัญชีผู้บริหารหรือช่างต้องมีสำนักงานที่ผูกไว้ก่อนจึงจะสร้างรายงานได้
          </p>
        </Card>
      </div>
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedReason = reason.trim()
    if (!normalizedReason) {
      setValidationError('กรุณาระบุสิ่งที่พบเพื่อให้ตรวจสอบย้อนหลังได้')
      return
    }
    if (isAdmin && !officeId.trim()) {
      setValidationError('กรุณาเลือกสำนักงานที่ต้องการรายงาน')
      return
    }

    try {
      const normalizedExpected = optionalQuantity(expectedQty, 'จำนวนที่คาด')
      const normalizedObserved = optionalQuantity(observedQty, 'จำนวนที่พบ')
      if (
        normalizedExpected !== undefined
        && normalizedObserved !== undefined
        && normalizedExpected === normalizedObserved
      ) {
        setValidationError('จำนวนที่คาดและจำนวนที่พบต้องไม่เท่ากัน')
        return
      }
      const normalizedCoverID = optionalReference(coverId)
      const normalizedWorkOrderID = optionalReference(workOrderId)
      const normalizedBorrowID = optionalReference(borrowId)
      const payload: CreateDiscrepancyRequest = {
        type,
        reason: normalizedReason,
        ...(isAdmin ? { officeId: officeId.trim() } : {}),
        ...(normalizedExpected !== undefined ? { expectedQty: normalizedExpected } : {}),
        ...(normalizedObserved !== undefined ? { observedQty: normalizedObserved } : {}),
        ...(normalizedCoverID ? { coverId: normalizedCoverID } : {}),
        ...(normalizedWorkOrderID ? { workOrderId: normalizedWorkOrderID } : {}),
        ...(normalizedBorrowID ? { borrowId: normalizedBorrowID } : {}),
      }
      setValidationError(null)
      const created = await createDiscrepancy.mutateAsync(payload)
      router.replace(`/discrepancies/${encodeURIComponent(created.id)}`)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setValidationError(error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง')
      }
    }
  }

  return (
    <div className="page-padding mx-auto max-w-3xl space-y-5">
      <header className="flex items-start gap-3">
        <Link
          href="/discrepancies"
          className="-ml-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="กลับไปหน้าข้อคลาดเคลื่อน"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Field observation</p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">รายงานสิ่งที่พบ</h1>
          <p className="mt-1 text-sm text-gray-500">
            สำนักงาน: {officeLabel}
          </p>
        </div>
      </header>

      <DiscrepancyStockNotice />

      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <ClipboardPlus className="h-5 w-5 text-amber-700" aria-hidden />
            <h2 className="font-semibold text-gray-900">สิ่งที่ตรวจพบ</h2>
          </div>
          {isAdmin && (
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <Select
                label="สำนักงานที่ต้องการรายงาน"
                required
                placeholder={officesQuery.isLoading ? 'กำลังโหลดสำนักงาน…' : 'เลือกสำนักงาน'}
                options={officeOptions}
                value={officeId}
                disabled={officesQuery.isLoading || Boolean(officesQuery.error)}
                error={validationError?.includes('เลือกสำนักงาน') ? validationError : undefined}
                onChange={(event) => {
                  setOfficeId(event.target.value)
                  if (validationError?.includes('เลือกสำนักงาน')) setValidationError(null)
                }}
              />
              {officesQuery.error && (
                <div role="alert" className="flex flex-col items-start gap-2 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                  <span>ไม่สามารถโหลดรายชื่อสำนักงานได้</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={officesQuery.isFetching}
                    onClick={() => void officesQuery.refetch()}
                  >
                    ลองอีกครั้ง
                  </Button>
                </div>
              )}
            </div>
          )}
          <Select
            label="ประเภท"
            required
            options={MANUAL_DISCREPANCY_OPTIONS}
            value={type}
            onChange={(event) => { setType(event.target.value as ManualDiscrepancyType) }}
          />
          <Textarea
            label="เหตุผลและรายละเอียด"
            required
            maxLength={1000}
            rows={5}
            value={reason}
            hint="สูงสุด 1,000 ตัวอักษร ระบุสิ่งที่เห็นจริงโดยไม่สั่งเปลี่ยนสถานะฉนวน"
            onChange={(event) => {
              setReason(event.target.value)
              if (validationError) setValidationError(null)
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="จำนวนที่คาด (ไม่บังคับ)"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={expectedQty}
              onChange={(event) => { setExpectedQty(event.target.value) }}
            />
            <Input
              label="จำนวนที่พบ (ไม่บังคับ)"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={observedQty}
              onChange={(event) => { setObservedQty(event.target.value) }}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Link2 className="h-5 w-5 text-gray-500" aria-hidden />
            <div>
              <h2 className="font-semibold text-gray-900">ข้อมูลอ้างอิง</h2>
              <p className="text-xs text-gray-500">ใช้สืบค้นเท่านั้น ไม่ใช่คำสั่งแก้รายการต้นทาง</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Cover ID (ไม่บังคับ)" value={coverId} leftAddon={<Hash className="h-4 w-4" />} onChange={(event) => { setCoverId(event.target.value) }} />
            <Input label="Work order ID (ไม่บังคับ)" value={workOrderId} leftAddon={<Hash className="h-4 w-4" />} onChange={(event) => { setWorkOrderId(event.target.value) }} />
          </div>
          <Input label="Borrow ID (ไม่บังคับ)" value={borrowId} leftAddon={<Hash className="h-4 w-4" />} onChange={(event) => { setBorrowId(event.target.value) }} />
        </Card>

        {validationError && !validationError.includes('เลือกสำนักงาน') && (
          <p role="alert" className="text-sm font-medium text-red-600">{validationError}</p>
        )}
        {createDiscrepancy.error && !validationError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {createDiscrepancy.error instanceof ApiError
              ? createDiscrepancy.error.message
              : 'ส่งรายงานไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={createDiscrepancy.isPending} onClick={() => router.back()}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            size="lg"
            loading={createDiscrepancy.isPending}
            disabled={createDiscrepancy.isPending || (isAdmin && (officesQuery.isLoading || Boolean(officesQuery.error)))}
          >
            ส่งรายงานเพื่อตรวจสอบ
          </Button>
        </div>
      </form>
    </div>
  )
}
