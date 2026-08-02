'use client'

import { useState, type ReactNode } from 'react'
import { CircleDollarSign, Download, FileBarChart, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { useReportSummary } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useOffices } from '@/hooks/useOffices'
import { currentBangkokGregorianYear } from '@/lib/thaiDate'
import { formatSatangAsBaht } from '@/lib/money'

export default function ReportsPage() {
  const { user } = useAuth()
  const [officeId, setOfficeId] = useState('')
  const currentYear = currentBangkokGregorianYear()
  const [year, setYear] = useState(currentYear)
  const { data: offices = [] } = useOffices(user?.role === 'admin')
  const { data, isLoading, isError, refetch } = useReportSummary(
    officeId || undefined,
    year,
    user?.role === 'admin',
  )

  if (user?.role !== 'admin') return <Forbidden />

  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index)

  async function downloadCsv() {
    const params = new URLSearchParams({ year: String(year) })
    if (officeId) params.set('officeId', officeId)
    const blob = await api.download(`/reports/export.csv?${params.toString()}`)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `smart-cover-report-${year + 543}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-padding mx-auto w-full max-w-none">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold">รายงาน</h1>
          <p className="mt-1 text-sm text-gray-600">ภาพรวมข้อมูลฉนวน ใบงาน และรายได้ตามปี</p>
        </div>
        <Button leftIcon={<Download className="h-4 w-4" />} onClick={() => void downloadCsv()}>
          ดาวน์โหลด CSV
        </Button>
      </header>

      <Card className="mb-5">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Select
            label="สำนักงาน"
            placeholder="ทุกสำนักงาน"
            options={offices.map((office) => ({ value: office.id, label: office.name }))}
            value={officeId}
            onChange={(event) => setOfficeId(event.target.value)}
          />
          <Select
            label="ปีรายงาน"
            options={yearOptions.map((option) => ({
              value: String(option),
              label: `พ.ศ. ${option + 543}`,
            }))}
            value={String(year)}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </div>
      </Card>

      {isLoading ? (
        <Card><p className="text-sm text-gray-600">กำลังโหลดรายงาน…</p></Card>
      ) : isError ? (
        <Card>
          <p className="text-sm text-red-700">โหลดรายงานไม่สำเร็จ</p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()}>ลองใหม่</Button>
        </Card>
      ) : !data ? (
        <Card><p className="text-sm text-gray-600">ยังไม่มีข้อมูลรายงาน</p></Card>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="ฉนวนทั้งหมด" value={data.totalCovers} />
            <Kpi label="ติดตั้งอยู่" value={data.installedCovers} />
            <Kpi label="อัตราการใช้งาน" value={`${data.utilization}%`} primary />
            <Kpi label="ใบงานที่ดำเนินการ" value={data.activeWorkOrders} />
            <Kpi
              label={`รายได้รวม VAT ปี ${data.year + 543}`}
              value={formatSatangAsBaht(data.completedRevenueIncludingVatSatang)}
              icon={<CircleDollarSign className="h-5 w-5" />}
            />
          </div>

          <Card className="mb-5">
            <h2 className="font-semibold">ฉนวนที่ติดตั้งอยู่ตามประเภทการใช้งาน</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Kpi label="งานครอบให้ผู้ใช้ไฟฟ้า" value={data.usageByType?.CUSTOMER_COVER ?? 0} />
              <Kpi label="ใช้งานภายใน" value={data.usageByType?.INTERNAL ?? 0} />
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="flex items-center gap-2 p-4">
              <FileBarChart className="h-5 w-5 text-pea-600" />
              <h2 className="font-semibold">รายสำนักงาน</h2>
            </div>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-t bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">สำนักงาน</th>
                  <th className="px-4 py-3 text-right font-semibold">ฉนวนทั้งหมด</th>
                  <th className="px-4 py-3 text-right font-semibold">ติดตั้งอยู่</th>
                  <th className="px-4 py-3 text-right font-semibold">การใช้งาน</th>
                  <th className="px-4 py-3 text-right font-semibold">รายได้รวม VAT</th>
                </tr>
              </thead>
              <tbody>
                {data.byOffice.map((row) => (
                  <tr key={row.office.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.office.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.installed}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{row.utilization}%</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-pea-800">
                      {formatSatangAsBaht(row.completedRevenueIncludingVatSatang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  primary,
  icon,
}: {
  label: string
  value: string | number
  primary?: boolean
  icon?: ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{label}</p>
        {icon ? <span className="text-pea-600">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${primary ? 'text-pea-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </Card>
  )
}

function Forbidden() {
  return (
    <div className="page-padding mx-auto max-w-lg py-16 text-center">
      <Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
      <p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p>
    </div>
  )
}
