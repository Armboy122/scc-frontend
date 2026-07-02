'use client'

import { useState } from 'react'
import { Lock, Radio, RotateCw, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStock } from '@/hooks/useStock'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function RfidPage() {
  const { user } = useAuth()
  const { data: stock = [] } = useStock()
  const [scanCount, setScanCount] = useState(0)
  const expected = stock.reduce((sum, row) => sum + row.inStock, 0)
  const actual = scanCount || Math.max(expected - 2, 0)
  const diff = expected - actual

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
        <h1 className="text-xl font-bold text-gray-900">ยิงนับคลัง RFID</h1>
        <p className="text-sm text-gray-500 mt-0.5">ตรวจนับคลังและแยกรายการที่ระบบมีแต่ยิงไม่เจอ</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-600" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">ผลตรวจนับล่าสุด</h2>
              <p className="text-xs text-gray-500">Phase 3 shell: ยังไม่เชื่อม reader จริง</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">ระบบบันทึก</p>
              <p className="font-mono text-3xl font-bold text-gray-900">{expected}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">นับจริง RFID</p>
              <p className="font-mono text-3xl font-bold text-blue-700">{actual}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              leftIcon={<RotateCw className="w-4 h-4" />}
              onClick={() => setScanCount(Math.max(expected - Math.floor(Math.random() * 4), 0))}
            >
              ยิงซ้ำ
            </Button>
            <Button className="flex-1" leftIcon={<Send className="w-4 h-4" />} disabled>
              แจ้ง admin
            </Button>
          </div>
        </Card>

        <Card className={diff > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <h2 className={['font-semibold mb-3', diff > 0 ? 'text-red-800' : 'text-green-800'].join(' ')}>
            {diff > 0 ? `พบส่วนต่าง ${diff} ตัว` : 'ไม่พบส่วนต่าง'}
          </h2>
          {diff > 0 ? (
            <div className="space-y-2">
              {Array.from({ length: Math.min(diff, 5) }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-3 py-2"
                >
                  <span className="font-mono text-sm text-red-700">
                    CC-MISSING-{String(index + 1).padStart(3, '0')}
                  </span>
                  <span className="text-xs font-semibold text-red-700">หาย?</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-700">จำนวนในระบบตรงกับจำนวนที่ยิงอ่านได้</p>
          )}
        </Card>
      </div>
    </div>
  )
}
