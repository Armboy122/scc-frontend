'use client'

import { BriefcaseBusiness, CheckCircle2, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStock } from '@/hooks/useStock'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function UsageModesPage() {
  const { user } = useAuth()
  const { data: stock = [] } = useStock()
  const totalAvailable = stock.reduce((sum, row) => sum + row.inStock, 0)

  if (user?.role !== 'admin') {
    return (
      <div className="page-padding max-w-lg mx-auto text-center py-16">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
        <p className="font-medium text-gray-900">สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    )
  }

  return (
    <div className="page-padding max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">โหมดการใช้งาน</h1>
        <p className="text-sm text-gray-500 mt-0.5">ระบบใช้ workflow เดียวสำหรับงานครอบให้ผู้ใช้ไฟฟ้า</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card className="border-pea-200 bg-pea-50">
          <BriefcaseBusiness className="w-8 h-8 text-pea-600 mb-4" aria-hidden />
          <h2 className="font-semibold text-gray-900">งานครอบให้ผู้ใช้ไฟฟ้า</h2>
          <p className="text-sm text-gray-600 mt-1">
            เปิดใบงาน ติดตั้ง สแกนฉนวน ถอดคืน และคืนสต็อกผ่าน flow เดียวตาม PRD
          </p>
          <p className="text-3xl font-mono font-bold text-pea-700 mt-5">{totalAvailable}</p>
          <p className="text-xs text-gray-500">พร้อมใช้รวมทุกสำนักงาน</p>
        </Card>

        <Card>
          <CheckCircle2 className="w-8 h-8 text-green-600 mb-4" aria-hidden />
          <h2 className="font-semibold text-gray-900">สถานะ configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            ปิดการแยก usage type อื่นแล้ว เพื่อให้รายงานและสต็อกไม่แตก branch เกินจำเป็น
          </p>
          <p className="text-3xl font-mono font-bold text-gray-900 mt-5">1</p>
          <p className="text-xs text-gray-500">โหมดใช้งานที่เปิดอยู่</p>
        </Card>
      </div>

      <div className="mt-5 card-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Backend คืนค่า usage mode เดียว: <span className="font-mono">CUSTOMER_COVER</span>
        </p>
        <Button disabled variant="outline">ล็อกตาม PRD</Button>
      </div>
    </div>
  )
}
