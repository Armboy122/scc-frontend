'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { DiscrepancyStockNotice } from '@/components/feature/DiscrepancyStockNotice'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useDiscrepancies } from '@/hooks/useDiscrepancies'
import { useOffices } from '@/hooks/useOffices'
import { useAuth } from '@/lib/auth'
import {
  formatDiscrepancyDate,
  getDiscrepancyStatusLabel,
  getDiscrepancyTypeLabel,
} from '@/lib/discrepancyPresentation'
import type { DiscrepancyQueryParams, DiscrepancyStatus, DiscrepancyType } from '@/lib/types'

const TYPE_OPTIONS = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'UNEXPECTED_COVER', label: 'พบฉนวนเกิน' },
  { value: 'MISSING_COVER', label: 'ฉนวนขาดจากที่คาด' },
  { value: 'CAPACITY_SHORTFALL', label: 'กำลังสำรองไม่พอ' },
  { value: 'OTHER', label: 'ข้อสังเกตอื่น' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'OPEN', label: 'รอตรวจสอบ' },
  { value: 'RESOLVED', label: 'ปิดเรื่องแล้ว' },
]

function DiscrepancyStatusPill({ status }: { status: DiscrepancyStatus }) {
  return (
    <span className={[
      'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
      status === 'OPEN'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
    ].join(' ')}>
      {getDiscrepancyStatusLabel(status)}
    </span>
  )
}

export default function DiscrepanciesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { data: offices = [] } = useOffices(Boolean(user))
  const [operatorStatus, setOperatorStatus] = useState<DiscrepancyStatus | ''>('')
  const [adminStatus, setAdminStatus] = useState<DiscrepancyStatus | ''>('OPEN')
  const [type, setType] = useState<DiscrepancyType | ''>('')
  const params: DiscrepancyQueryParams = {
    ...(isAdmin
      ? (adminStatus ? { status: adminStatus } : {})
      : (operatorStatus ? { status: operatorStatus } : {})),
    ...(type ? { type } : {}),
  }
  const canRead = Boolean(user && (isAdmin || user.officeId))
  const discrepanciesQuery = useDiscrepancies(params, canRead)
  const discrepancies = discrepanciesQuery.data ?? []

  return (
    <div className="page-padding mx-auto max-w-4xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Audit queue
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">
            {isAdmin ? 'คิวตรวจสอบทุกสำนักงาน' : 'ข้อคลาดเคลื่อนของสำนักงานฉัน'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'ตรวจสอบรายงานที่เปิดอยู่จากทุกสำนักงานและบันทึกวิธีปิดเรื่อง'
              : `รายงานและติดตามข้อสังเกตของ ${user?.office?.name ?? offices.find((office) => office.id === user?.officeId)?.name ?? 'สำนักงานของคุณ'}`}
          </p>
        </div>
        {canRead && (
          <Link
            href="/discrepancies/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-pea-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pea-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            รายงานสิ่งที่พบ
          </Link>
        )}
      </header>

      <DiscrepancyStockNotice />

      <Card className="border-gray-200 bg-white">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="สถานะ"
            options={STATUS_OPTIONS}
            value={isAdmin ? adminStatus : operatorStatus}
            onChange={(event) => {
              const value = event.target.value as DiscrepancyStatus | ''
              if (isAdmin) setAdminStatus(value)
              else setOperatorStatus(value)
            }}
          />
          <Select
            label="ประเภท"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(event) => { setType(event.target.value as DiscrepancyType | '') }}
          />
        </div>
      </Card>

      {!canRead && (
        <Card className="border-red-200 bg-red-50">
          <p role="alert" className="text-sm font-medium text-red-700">
            บัญชีนี้ไม่มีสำนักงานที่ตรวจสอบได้
          </p>
        </Card>
      )}

      {canRead && discrepanciesQuery.isLoading && (
        <div className="space-y-3" aria-label="กำลังโหลดข้อคลาดเคลื่อน">
          {['one', 'two', 'three'].map((id) => (
            <div key={id} className="card-surface h-36 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {canRead && discrepanciesQuery.error && (
        <Card className="border-red-200 bg-red-50 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" aria-hidden />
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            ไม่สามารถโหลดข้อคลาดเคลื่อนได้
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            loading={discrepanciesQuery.isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void discrepanciesQuery.refetch()}
          >
            ลองอีกครั้ง
          </Button>
        </Card>
      )}

      {canRead && !discrepanciesQuery.isLoading && !discrepanciesQuery.error && discrepancies.length === 0 && (
        <Card className="py-12 text-center">
          <AlertTriangle className="mx-auto h-11 w-11 text-gray-300" aria-hidden />
          <p className="mt-3 font-medium text-gray-600">
            {isAdmin ? 'ไม่มีรายการในคิวตรวจสอบนี้' : 'ยังไม่มีข้อคลาดเคลื่อนในมุมมองนี้'}
          </p>
        </Card>
      )}

      {canRead && !discrepanciesQuery.isLoading && !discrepanciesQuery.error && discrepancies.length > 0 && (
        <div className="space-y-3">
          {discrepancies.map((discrepancy) => (
            <Link
              key={discrepancy.id}
              href={`/discrepancies/${encodeURIComponent(discrepancy.id)}`}
              aria-label={`เปิดข้อคลาดเคลื่อน ${getDiscrepancyTypeLabel(discrepancy.type)} ของ ${discrepancy.office.name}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500 focus-visible:ring-offset-2"
            >
              <Card hoverable className="border-l-4 border-l-amber-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      {getDiscrepancyTypeLabel(discrepancy.type)}
                    </p>
                    <h2 className="mt-1 truncate font-semibold text-gray-900">{discrepancy.office.name}</h2>
                  </div>
                  <DiscrepancyStatusPill status={discrepancy.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{discrepancy.reason}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>{formatDiscrepancyDate(discrepancy.createdAt)}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-pea-700">
                    เปิดรายละเอียด <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
