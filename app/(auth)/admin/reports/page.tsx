'use client'

import { BarChart3, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStock } from '@/hooks/useStock'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function ReportsPage() {
  const { user } = useAuth()
  const { data: stock = [] } = useStock()
  const { data: orders = [] } = useWorkOrders()

  if (user?.role !== 'admin') {
    return (
      <div className="page-padding max-w-lg mx-auto text-center py-16">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
        <p className="font-medium text-gray-900">สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    )
  }

  const total = stock.reduce((sum, row) => sum + row.total, 0)
  const installed = stock.reduce((sum, row) => sum + row.installed, 0)
  const utilization = total > 0 ? Math.round((installed / total) * 100) : 0
  const activeOrders = orders.filter((order) => order.status === 'ACTIVE' || order.status === 'REMOVAL_DUE').length

  return (
    <div className="page-padding max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">รายงาน / วิเคราะห์</h1>
          <p className="text-sm text-gray-500 mt-0.5">ภาพรวมการใช้งานฉนวนและประสิทธิภาพรายสำนักงาน</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:w-80">
          <Input type="date" aria-label="วันที่เริ่มต้น" />
          <Input type="date" aria-label="วันที่สิ้นสุด" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Card>
          <p className="text-xs text-gray-500">อัตราใช้งาน</p>
          <p className="font-mono text-3xl font-bold text-pea-700 mt-2">{utilization}%</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">ใบงาน active</p>
          <p className="font-mono text-3xl font-bold text-gray-900 mt-2">{activeOrders}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">ฉนวนรวม</p>
          <p className="font-mono text-3xl font-bold text-gray-900 mt-2">{total}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-pea-600" aria-hidden />
          <h2 className="font-semibold text-gray-900">อัตราใช้งานตามสำนักงาน</h2>
        </div>
        <div className="space-y-4">
          {stock.map((row) => {
            const percent = row.total > 0 ? Math.round((row.installed / row.total) * 100) : 0
            return (
              <div key={row.officeId}>
                <div className="flex items-center justify-between gap-3 text-sm mb-1">
                  <span className="font-medium text-gray-800 truncate">{row.office?.name ?? row.officeId}</span>
                  <span className="font-mono font-bold text-gray-900">{percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-pea-600" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
          {stock.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีข้อมูลสำหรับรายงาน</p>
          )}
        </div>
      </Card>
    </div>
  )
}
