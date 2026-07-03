'use client'

import { Package } from 'lucide-react'
import { useStock } from '@/hooks/useStock'
import { Card } from '@/components/ui/Card'
import { StockBadge } from '@/components/ui/StockBadge'
import type { StockSummary } from '@/lib/types'

function officeDisplayName(stock: StockSummary) {
  return stock.office?.name ?? 'ไม่พบชื่อสำนักงาน'
}

export default function StockPage() {
  const { data: stockList = [], isLoading, error } = useStock()

  return (
    <div className="page-padding max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">สต็อกฉนวน</h1>
        <p className="text-sm text-gray-500 mt-0.5">รายการสต็อกแยกตามสำนักงาน</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-surface p-4 h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="card-surface p-6 text-center text-red-600 text-sm">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      )}

      {!isLoading && !error && stockList.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden />
          <p className="text-gray-500">ยังไม่มีข้อมูลสต็อก</p>
        </div>
      )}

      {/* Mobile cards */}
      {!isLoading && !error && stockList.length > 0 && (
        <>
          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            {stockList.map((stock) => (
              <Card key={stock.officeId}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">
                    {officeDisplayName(stock)}
                  </h2>
                  <StockBadge count={stock.total} label="ทั้งหมด" />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                    <dt className="text-xs text-gray-500 mb-1">ในคลัง</dt>
                    <dd className="font-bold text-green-700 text-lg tabular-nums">{stock.inStock}</dd>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <dt className="text-xs text-gray-500 mb-1">ติดตั้งแล้ว</dt>
                    <dd className="font-bold text-blue-700 text-lg tabular-nums">{stock.installed}</dd>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                    <dt className="text-xs text-gray-500 mb-1">ให้ยืม</dt>
                    <dd className="font-bold text-orange-700 text-lg tabular-nums">{stock.onLoanOut}</dd>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-2.5 text-center">
                    <dt className="text-xs text-gray-500 mb-1">ยืมมา</dt>
                    <dd className="font-bold text-violet-700 text-lg tabular-nums">{stock.onLoanIn}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card-surface overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">สำนักงาน</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ในคลัง</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ติดตั้งแล้ว</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ให้ยืม</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ยืมมา</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">ทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {stockList.map((stock, i) => (
                  <tr
                    key={stock.officeId}
                    className={['border-b border-gray-100 hover:bg-gray-50', i % 2 === 0 ? '' : ''].join(' ')}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {officeDisplayName(stock)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-green-700 tabular-nums">{stock.inStock}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-blue-700 tabular-nums">{stock.installed}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-700 tabular-nums">{stock.onLoanOut}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-violet-700 tabular-nums">{stock.onLoanIn}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StockBadge count={stock.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-gray-700">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-right text-green-700 tabular-nums">
                    {stockList.reduce((s, r) => s + r.inStock, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 tabular-nums">
                    {stockList.reduce((s, r) => s + r.installed, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700 tabular-nums">
                    {stockList.reduce((s, r) => s + r.onLoanOut, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-violet-700 tabular-nums">
                    {stockList.reduce((s, r) => s + r.onLoanIn, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {stockList.reduce((s, r) => s + r.total, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
