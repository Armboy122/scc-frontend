'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, Radio, Search, Shield } from 'lucide-react'
import { useCovers } from '@/hooks/useCovers'
import { useAuth } from '@/lib/auth'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useOffices } from '@/hooks/useOffices'
import { getCoverContextLabels } from '@/lib/coverPresentation'
import type { CoverStatus } from '@/lib/types'

const STATUS_OPTIONS: { label: string; value: CoverStatus | 'ALL' }[] = [
  { label: 'ทั้งหมด', value: 'ALL' },
  { label: 'พร้อมติดตั้ง',  value: 'IN_STOCK' },
  { label: 'ติดตั้ง',  value: 'INSTALLED' },
  { label: 'ปลดออก',  value: 'RETIRED' },
]

export default function CoversPage() {
  const { user } = useAuth()
  const router = useRouter()
  const canManageNfc = user?.role === 'admin' || user?.role === 'tech'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CoverStatus | 'ALL'>('ALL')
  const [officeId, setOfficeId] = useState('')
  // The list API supplies names for the rare projection where a cover omits
  // ownerOffice. Never make an internal office ID the user-facing fallback.
  const { data: offices = [] } = useOffices()

  const { data: covers = [], isLoading, error } = useCovers({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    q: search.trim() || undefined,
    officeId: user?.role === 'admin' ? officeId || undefined : undefined,
  })

  const contextLabels = (cover: { status: CoverStatus; ownerOfficeId: string; currentOfficeId: string }) =>
    getCoverContextLabels(cover).slice(1)
  const officeName = (cover: { ownerOfficeId: string; ownerOffice?: { name: string } }) =>
    cover.ownerOffice?.name ?? offices.find((office) => office.id === cover.ownerOfficeId)?.name ?? 'ไม่ระบุสำนักงาน'

  return (
    <div className="page-padding max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">รายการฉนวน</h1>
          <p className="text-sm text-gray-500 mt-0.5">ดูสถานะและกดแต่ละรายการเพื่อดูประวัติการยืม–คืน</p>
        </div>
        {canManageNfc && <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" leftIcon={<Radio className="h-4 w-4" />} onClick={() => router.push('/covers/check-tag')}>ตรวจ NFC</Button>
          <Button type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push('/covers/write-nfc')}>เพิ่ม NFC</Button>
        </div>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <Input
            placeholder="ค้นหา รหัสทรัพย์สิน หรือ QR Code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="กรองสถานะ">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={[
                'flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                statusFilter === opt.value
                  ? 'bg-pea-600 text-white border-pea-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {user?.role === 'admin' && <div className="sm:w-56"><Select aria-label="กรองสำนักงาน" placeholder="ทุกสำนักงาน" options={offices.map((office) => ({ value: office.id, label: office.name }))} value={officeId} onChange={(event) => setOfficeId(event.target.value)} /></div>}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-surface p-3 h-14 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="card-surface p-6 text-center text-red-600 text-sm">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      )}

      {!isLoading && !error && covers.length === 0 && (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500">ไม่พบฉนวนที่ตรงกับการค้นหา</p>
        </div>
      )}

      {!isLoading && !error && covers.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {covers.map((cover) => (
              <button key={cover.id} type="button" className="card-surface w-full p-3 text-left space-y-3 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500" onClick={() => router.push(`/covers/${cover.id}`)}>
                <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-pea-300 flex-shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-sm text-gray-900">{cover.assetCode}</p>
                  <p className="text-xs text-gray-500 truncate">{officeName(cover)}</p>
                </div>
                <StatusBadge coverStatus={cover.status} size="sm" />
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                </div>
                {contextLabels(cover).map((label) => (
                  <span key={label} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{label}</span>
                ))}
                <p className="text-xs font-medium text-pea-700">ดูประวัติยืม–คืน</p>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card-surface overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">รหัสทรัพย์สิน</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">สถานะ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">สำนักงานเจ้าของ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ประวัติ</th>
                </tr>
              </thead>
              <tbody>
                {covers.map((cover) => (
                  <tr key={cover.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/covers/${cover.id}`)}>
                    <td className="px-4 py-3 font-mono font-medium">{cover.assetCode}</td>
                    <td className="px-4 py-3">
                      <StatusBadge coverStatus={cover.status} size="sm" />
                      {contextLabels(cover).map((label) => (
                        <span key={label} className="ml-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{label}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {officeName(cover)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-pea-700">ดูยืม–คืน <ChevronRight className="h-4 w-4" aria-hidden /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-right">
            แสดง {covers.length} รายการ
          </p>
        </>
      )}
    </div>
  )
}
