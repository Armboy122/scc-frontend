'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, AlertCircle, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useBatchRegisterCovers } from '@/hooks/useCovers'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError } from '@/lib/api'
import { createCoverLabelSvg, downloadSvg, svgToDataUrl } from '@/lib/qr'
import type { Cover, RegisterCoverRequest } from '@/lib/types'

interface RowData {
  id: string
  assetCode: string
}

interface RowError {
  assetCode?: string
}

function createRow(): RowData {
  return { id: crypto.randomUUID(), assetCode: '' }
}

function buildQrCode(ownerOfficeId: string, assetCode: string): string {
  if (!ownerOfficeId.trim() || !assetCode.trim()) return '-'
  return `SCC:${ownerOfficeId.trim()}:${assetCode.trim()}`
}

export default function BatchRegisterPage() {
  const { user } = useAuth()
  const router = useRouter()
  const batchRegister = useBatchRegisterCovers()

  const [officeId, setOfficeId] = useState(user?.officeId ?? '')
  const [rows, setRows] = useState<RowData[]>([createRow()])
  const [rowErrors, setRowErrors] = useState<Record<string, RowError>>({})
  const [submitted, setSubmitted] = useState(false)
  const [createdCovers, setCreatedCovers] = useState<Cover[]>([])

  useEffect(() => {
    if (user?.role !== 'admin' && user?.officeId) {
      setOfficeId(user.officeId)
    }
  }, [user])

  const updateRow = (id: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    // Clear error on change
    setRowErrors((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id][field as keyof RowError]
      }
      return next
    })
  }

  const addRow = () => setRows((prev) => [...prev, createRow()])

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  const validate = (): boolean => {
    const errors: Record<string, RowError> = {}
    const seenCodes = new Set<string>()
    let valid = true

    rows.forEach((row) => {
      const rowErr: RowError = {}
      if (!row.assetCode.trim()) {
        rowErr.assetCode = 'จำเป็น'
        valid = false
      }
      if (row.assetCode && seenCodes.has(row.assetCode)) {
        rowErr.assetCode = 'ซ้ำ'
        valid = false
      }
      if (row.assetCode) seenCodes.add(row.assetCode)
      if (Object.keys(rowErr).length > 0) errors[row.id] = rowErr
    })

    setRowErrors(errors)
    return valid
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!officeId.trim()) return
    if (!validate()) return

    const items: RegisterCoverRequest[] = rows.map((r) => ({
      assetCode: r.assetCode.trim(),
      ownerOfficeId: officeId.trim(),
    }))

    try {
      const res = await batchRegister.mutateAsync({
        ownerOfficeId: officeId.trim(),
        items,
      })
      if (res.data) {
        setCreatedCovers(res.data)
        setRows([createRow()])
      }
    } catch {
      // error shown below
    }
  }

  return (
    <div className="page-padding max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ลงทะเบียนหลายรายการ</h1>
          <p className="text-sm text-gray-500">เพิ่มฉนวนหลายชิ้นพร้อมกัน</p>
        </div>
      </div>

      {/* Office selector */}
      <Card className="mb-5">
        <Input
          label="รหัสสำนักงานเจ้าของ"
          required
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          readOnly={user?.role !== 'admin'}
          error={submitted && !officeId.trim() ? 'กรุณากรอกรหัสสำนักงาน' : undefined}
          placeholder="Office ID"
        />
      </Card>

      {createdCovers.length > 0 && (
        <Card className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">QR ที่สร้างแล้ว</h2>
              <p className="text-sm text-gray-500">{createdCovers.length} รายการ</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setCreatedCovers([])}>
              ลงชุดใหม่
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {createdCovers.map((cover) => (
              <div key={cover.id} className="rounded-lg border border-gray-200 p-2 text-center">
                <Image
                  src={svgToDataUrl(createCoverLabelSvg(cover))}
                  alt={`QR Code ${cover.assetCode}`}
                  width={240}
                  height={240}
                  unoptimized
                  className="w-full h-auto"
                />
                <button
                  type="button"
                  onClick={() => downloadSvg(`cover-${cover.assetCode}.svg`, createCoverLabelSvg(cover))}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-pea-700 hover:text-pea-800"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden />
                  โหลด QR
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rows table */}
      <div className="mb-4 rounded-xl border border-pea-200 bg-pea-50 px-4 py-3 text-sm text-pea-900">
        <p className="font-semibold">NFC ใช้ Asset Code เดียวกัน</p>
        <p className="mt-1 text-pea-800">หลังลงทะเบียน ให้เขียน Asset Code ของแต่ละแถวเป็นข้อความลง NFC tag จึงไม่ต้องกรอก NFC ID แยก</p>
      </div>
      <Card padding="none" className="overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-10">#</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">รหัสทรัพย์สิน *</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">QR Code</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const errs = rowErrors[row.id] ?? {}
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        value={row.assetCode}
                        onChange={(e) => updateRow(row.id, 'assetCode', e.target.value)}
                        placeholder="PEA-XXXX"
                        className={[
                          'w-full h-9 px-2 rounded-lg border text-sm',
                          'focus:outline-none focus:ring-2 focus:ring-pea-400',
                          errs.assetCode ? 'border-red-400 bg-red-50' : 'border-gray-200',
                        ].join(' ')}
                      />
                      {errs.assetCode && (
                        <span className="text-xs text-red-600">{errs.assetCode}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="min-h-9 px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs text-gray-600 break-all">
                        {buildQrCode(officeId, row.assetCode)}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                        aria-label="ลบแถว"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-pea-600 hover:text-pea-700 font-medium"
          >
            <Plus className="w-4 h-4" aria-hidden />
            เพิ่มแถว
          </button>
        </div>
      </Card>

      {batchRegister.error instanceof ApiError && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden />
          {batchRegister.error.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1">
          ยกเลิก
        </Button>
        <Button
          size="lg"
          className="flex-1"
          loading={batchRegister.isPending}
          onClick={() => void handleSubmit()}
        >
          ลงทะเบียน {rows.length} รายการ
        </Button>
      </div>
    </div>
  )
}
