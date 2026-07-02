'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, MapPin } from 'lucide-react'
import { useWorkOrder, useSubmitRemove } from '@/hooks/useWorkOrders'
import { QrScanner } from '@/components/feature/QrScanner'
import { GpsPicker, type GpsCoords } from '@/components/feature/GpsPicker'
import { CoverScanList, type ScannedCover } from '@/components/feature/CoverScanList'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function RemovePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: order, isLoading } = useWorkOrder(id)
  const submitRemove = useSubmitRemove()

  const [removedCovers, setRemovedCovers] = useState<ScannedCover[]>([])
  const [manualCode, setManualCode] = useState('')
  const [gps, setGps] = useState<GpsCoords | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const addCode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    if (removedCovers.some((c) => c.code === trimmed)) {
      setScanError(`รหัส ${trimmed} สแกนแล้ว`)
      return
    }
    setScanError(null)
    setRemovedCovers((prev) => [...prev, { code: trimmed, scannedAt: new Date() }])
  }

  const handleManualAdd = () => {
    addCode(manualCode)
    setManualCode('')
  }

  const handleSubmit = async () => {
    try {
      await submitRemove.mutateAsync({
        id,
        payload: {
          coverCodes: removedCovers.map((c) => c.code),
          ...(gps ? { latitude: gps.latitude, longitude: gps.longitude } : {}),
        },
      })
      router.replace(`/workorders/${id}`)
    } catch {
      // error shown via mutation.error
    } finally {
      setConfirmOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-padding max-w-lg mx-auto">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    )
  }

  if (!order) return null

  const totalQty = order.actualQty ?? order.plannedQty
  const removedQty = removedCovers.length
  const allRemoved = removedQty >= totalQty
  const progress = Math.min(1, removedQty / totalQty)

  return (
    <div className="page-padding max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">ถอดฉนวน</h1>
          <p className="text-sm text-gray-500">{order.customerName}</p>
        </div>
      </div>

      {/* GPS navigation card */}
      {order.latitude && order.longitude && (
        <a
          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 card-surface p-4 border-pea-200 bg-pea-50 hover:bg-pea-100 transition-colors"
        >
          <MapPin className="w-6 h-6 text-pea-600 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-pea-900">นำทางไปยังสถานที่</p>
            <p className="text-xs text-pea-700 font-mono tabular-nums">
              {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
            </p>
          </div>
          <span className="ml-auto text-xs text-pea-600 font-medium flex-shrink-0">
            เปิด Maps →
          </span>
        </a>
      )}

      {/* Progress */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">ถอดแล้ว</span>
          <span className={['text-sm font-bold tabular-nums', allRemoved ? 'text-green-600' : 'text-orange-600'].join(' ')}>
            {removedQty} / {totalQty} ชิ้น
          </span>
        </div>
        <div
          className="w-full bg-gray-100 rounded-full h-2"
          role="progressbar"
          aria-valuenow={removedQty}
          aria-valuemax={totalQty}
        >
          <div
            className={['h-2 rounded-full transition-all duration-300', allRemoved ? 'bg-green-500' : 'bg-orange-500'].join(' ')}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {!allRemoved && (
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" aria-hidden />
            ถอดไม่ครบปิดงานไม่ได้ — ถอดไม่ครบ = คิดค่าบริการเพิ่ม
          </p>
        )}
      </Card>

      {/* QR Scanner */}
      <QrScanner onScan={addCode} />

      {/* Manual input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="ป้อนรหัสด้วยตนเอง"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualAdd() }}}
            error={scanError ?? undefined}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="flex-shrink-0 h-12 self-start"
          onClick={handleManualAdd}
          disabled={!manualCode.trim()}
        >
          เพิ่ม
        </Button>
      </div>

      {/* Removed list */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          ถอดแล้ว ({removedQty} ชิ้น)
        </h2>
        <CoverScanList covers={removedCovers} onRemove={(code) => setRemovedCovers((prev) => prev.filter((c) => c.code !== code))} />
      </Card>

      {/* GPS capture */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">ตำแหน่ง GPS (ขณะถอด)</p>
        <GpsPicker value={gps} onChange={setGps} />
      </div>

      {/* Close job button */}
      {!confirmOpen ? (
        <div className="space-y-2">
          <Button
            size="xl"
            fullWidth
            disabled={!allRemoved}
            onClick={() => setConfirmOpen(true)}
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
          >
            ปิดงาน ({removedQty}/{totalQty} ชิ้น)
          </Button>
          {!allRemoved && (
            <p className="text-xs text-center text-gray-400">
              ต้องถอดให้ครบ {totalQty} ชิ้น จึงจะปิดงานได้
            </p>
          )}
        </div>
      ) : (
        <Card className="bg-green-50 border-green-200 space-y-3">
          <p className="text-sm font-semibold text-green-900 text-center">
            ยืนยันการถอดฉนวนและปิดงาน?
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setConfirmOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              size="lg"
              className="flex-1"
              loading={submitRemove.isPending}
              onClick={() => void handleSubmit()}
            >
              ปิดงาน
            </Button>
          </div>
          {submitRemove.isError && (
            <p role="alert" className="text-xs text-red-600 text-center">
              เกิดข้อผิดพลาด กรุณาลองใหม่
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
