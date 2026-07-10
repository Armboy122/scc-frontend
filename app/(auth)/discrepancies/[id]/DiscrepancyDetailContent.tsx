'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Scale,
} from 'lucide-react'
import { DiscrepancyStockNotice } from '@/components/feature/DiscrepancyStockNotice'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { useDiscrepancy, useResolveDiscrepancy } from '@/hooks/useDiscrepancies'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  formatDiscrepancyDate,
  getDiscrepancyStatusLabel,
  getDiscrepancyTypeLabel,
} from '@/lib/discrepancyPresentation'
import type { DiscrepancyStatus } from '@/lib/types'

function StatusPill({ status }: { status: DiscrepancyStatus }) {
  return (
    <span className={[
      'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
      status === 'OPEN'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
    ].join(' ')}>
      {getDiscrepancyStatusLabel(status)}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-gray-900 sm:text-right">{children}</dd>
    </div>
  )
}

function ReferenceLink({ href, value }: { href: string; value: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-mono text-pea-700 hover:text-pea-800 hover:underline">
      {value}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}

export function DiscrepancyDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const discrepancyQuery = useDiscrepancy(id, Boolean(user))
  const resolveDiscrepancy = useResolveDiscrepancy()
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionError, setResolutionError] = useState<string | null>(null)
  const discrepancy = discrepancyQuery.data

  const resolve = async () => {
    const normalized = resolutionNote.trim()
    if (!normalized) {
      setResolutionError('กรุณาระบุวิธีตรวจสอบและปิดเรื่องเพื่อบันทึกใน audit trail')
      return
    }
    setResolutionError(null)
    try {
      await resolveDiscrepancy.mutateAsync({ id, resolutionNote: normalized })
      setResolutionNote('')
    } catch {
      // The mutation error is rendered below the form.
    }
  }

  if (discrepancyQuery.isLoading) {
    return (
      <div className="page-padding mx-auto max-w-3xl space-y-3" aria-label="กำลังโหลดรายละเอียดข้อคลาดเคลื่อน">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="card-surface h-72 animate-pulse bg-gray-100" />
      </div>
    )
  }

  if (discrepancyQuery.error || !discrepancy) {
    return (
      <div className="page-padding mx-auto max-w-lg py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" aria-hidden />
        <p role="alert" className="mt-3 font-medium text-red-600">ไม่สามารถโหลดรายละเอียดข้อคลาดเคลื่อนได้</p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            loading={discrepancyQuery.isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void discrepancyQuery.refetch()}
          >
            ลองอีกครั้ง
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>ย้อนกลับ</Button>
        </div>
      </div>
    )
  }

  const canResolve = user?.role === 'admin' && discrepancy.status === 'OPEN'

  return (
    <div className="page-padding mx-auto max-w-3xl space-y-5">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {getDiscrepancyTypeLabel(discrepancy.type)}
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">รายละเอียดข้อคลาดเคลื่อน</h1>
          <p className="mt-1 truncate font-mono text-xs text-gray-400">{discrepancy.id}</p>
        </div>
        <StatusPill status={discrepancy.status} />
      </header>

      <DiscrepancyStockNotice />

      <Card className="overflow-hidden" padding="none">
        <div className="border-b border-gray-100 bg-gray-950 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Observation record</p>
          <h2 className="mt-1 font-semibold">{discrepancy.office.name}</h2>
        </div>
        <dl className="px-5 py-1">
          <DetailRow label="ประเภท">{getDiscrepancyTypeLabel(discrepancy.type)}</DetailRow>
          <DetailRow label="สิ่งที่พบ">{discrepancy.reason}</DetailRow>
          <DetailRow label="จำนวนที่คาด">
            {discrepancy.expectedQty === null ? '—' : `${discrepancy.expectedQty} ชิ้น`}
          </DetailRow>
          <DetailRow label="จำนวนที่พบ">
            {discrepancy.observedQty === null ? '—' : `${discrepancy.observedQty} ชิ้น`}
          </DetailRow>
          <DetailRow label="ผู้รายงาน">
            {discrepancy.reportedById ? <span className="font-mono">{discrepancy.reportedById}</span> : 'ระบบ'}
          </DetailRow>
          <DetailRow label="เวลารายงาน">{formatDiscrepancyDate(discrepancy.createdAt)}</DetailRow>
        </dl>
      </Card>

      {(discrepancy.coverId || discrepancy.workOrderId || discrepancy.borrowId) && (
        <Card>
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Scale className="h-5 w-5 text-gray-500" aria-hidden />
            <div>
              <h2 className="font-semibold text-gray-900">รายการอ้างอิงเพื่อสืบค้น</h2>
              <p className="text-xs text-gray-500">ลิงก์เหล่านี้ไม่ใช่คำสั่งแก้ข้อมูล</p>
            </div>
          </div>
          <dl className="mt-1">
            {discrepancy.coverId && (
              <DetailRow label="Cover ID"><span className="font-mono">{discrepancy.coverId}</span></DetailRow>
            )}
            {discrepancy.workOrderId && (
              <DetailRow label="Work order">
                <ReferenceLink href={`/workorders/${encodeURIComponent(discrepancy.workOrderId)}`} value={discrepancy.workOrderId} />
              </DetailRow>
            )}
            {discrepancy.borrowId && (
              <DetailRow label="Borrow">
                <ReferenceLink href={`/borrows/${encodeURIComponent(discrepancy.borrowId)}`} value={discrepancy.borrowId} />
              </DetailRow>
            )}
          </dl>
        </Card>
      )}

      {discrepancy.status === 'RESOLVED' && (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" aria-hidden />
            <div className="min-w-0">
              <h2 className="font-semibold text-emerald-950">บันทึกการปิดเรื่อง</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{discrepancy.resolutionNote}</p>
              <p className="mt-3 text-xs text-emerald-700">
                {formatDiscrepancyDate(discrepancy.resolvedAt)}
                {discrepancy.resolvedById ? ` · โดย ${discrepancy.resolvedById}` : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {canResolve && (
        <Card className="border-amber-200">
          <h2 className="font-semibold text-gray-900">ปิดเรื่องพร้อมบันทึกการตรวจสอบ</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            การปิดเรื่องบันทึกผลการตรวจสอบเท่านั้น และไม่เปลี่ยนสต็อกโดยอัตโนมัติ
          </p>
          <div className="mt-4">
            <Textarea
              label="บันทึกการแก้ไข (จำเป็น)"
              required
              maxLength={1000}
              rows={5}
              value={resolutionNote}
              error={resolutionError ?? undefined}
              disabled={resolveDiscrepancy.isPending}
              onChange={(event) => {
                setResolutionNote(event.target.value)
                if (resolutionError) setResolutionError(null)
              }}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="lg"
              loading={resolveDiscrepancy.isPending}
              disabled={resolveDiscrepancy.isPending}
              onClick={() => void resolve()}
            >
              ยืนยันปิดเรื่อง
            </Button>
          </div>
          {resolveDiscrepancy.error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {resolveDiscrepancy.error instanceof ApiError
                ? resolveDiscrepancy.error.message
                : 'ปิดเรื่องไม่สำเร็จ กรุณาตรวจสอบสถานะล่าสุดแล้วลองอีกครั้ง'}
            </p>
          )}
        </Card>
      )}

      {!canResolve && discrepancy.status === 'OPEN' && (
        <Card className="border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-900">
            รายการนี้รอผู้ดูแลระบบตรวจสอบ ผู้รายงานและสำนักงานสามารถติดตามได้แบบอ่านอย่างเดียว
          </p>
        </Card>
      )}
    </div>
  )
}
