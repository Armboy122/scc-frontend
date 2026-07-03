'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useWorkOrder, useSubmitInstall } from '@/hooks/useWorkOrders'
import { ApiError } from '@/lib/api'
import { QrScanner } from '@/components/feature/QrScanner'
import { PhotoCapture } from '@/components/feature/PhotoCapture'
import { CoverScanList, type ScannedCover } from '@/components/feature/CoverScanList'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'

export default function InstallPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: order, isLoading } = useWorkOrder(id)
  const submitInstall = useSubmitInstall()

  const [scannedCovers, setScannedCovers] = useState<ScannedCover[]>([])
  const [manualCode, setManualCode] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [isSubmittingInstall, setIsSubmittingInstall] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    title: string
    message: string
    onClose?: () => void
  } | null>(null)

  useEffect(() => {
    if (order && order.status !== 'SCHEDULED') {
      router.replace(`/workorders/${id}`)
    }
  }, [id, order, router])

  const addCode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    if (scannedCovers.some((c) => c.code === trimmed)) {
      setScanError(`รหัส ${trimmed} สแกนแล้ว`)
      return
    }
    setScanError(null)
    setScannedCovers((prev) => [...prev, { code: trimmed, scannedAt: new Date() }])
  }

  const removeCode = (code: string) => {
    setScannedCovers((prev) => prev.filter((c) => c.code !== code))
  }

  const handleManualAdd = () => {
    addCode(manualCode)
    setManualCode('')
  }

  const handleSubmit = async () => {
    if (isSubmittingInstall || submitInstall.isPending) return

    setIsSubmittingInstall(true)
    try {
      await submitInstall.mutateAsync({
        id,
        payload: {
          coverCodes: scannedCovers.map((c) => c.code),
        },
      })
      setFeedback({
        tone: 'success',
        title: 'บันทึกงานติดตั้งสำเร็จ',
        message: `ติดตั้งฉนวน ${scannedCovers.length} ชิ้นเรียบร้อยแล้ว สถานะใบงานจะเปลี่ยนเป็นติดตั้ง`,
        onClose: () => {
          router.refresh()
          router.replace(`/workorders/${id}`)
        },
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setFeedback({
        tone: 'error',
        title: 'บันทึกงานติดตั้งไม่สำเร็จ',
        message,
      })
      setIsSubmittingInstall(false)
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

  const plannedQty = order.plannedQty
  const scannedQty = scannedCovers.length
  const progress = plannedQty > 0 ? Math.min(1, scannedQty / plannedQty) : 0
  const submitLocked = isSubmittingInstall || submitInstall.isPending || order.status !== 'SCHEDULED'

  return (
    <>
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
          <h1 className="text-lg font-bold text-gray-900">ติดตั้งฉนวน</h1>
          <p className="text-sm text-gray-500">{order.customerName}</p>
        </div>
      </div>

      {/* Progress */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">ความคืบหน้า</span>
          <span className="text-sm font-bold text-pea-600 tabular-nums">
            {scannedQty} / {plannedQty} ชิ้น
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={scannedQty} aria-valuemax={plannedQty}>
          <div
            className="h-2 rounded-full bg-pea-600 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </Card>

      {/* QR Scanner */}
      <QrScanner onScan={addCode} />

      {/* Manual code input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="ป้อนรหัสด้วยตนเอง"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualAdd() }}}
            error={scanError ?? undefined}
            disabled={submitLocked}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="flex-shrink-0 h-12 self-start"
          onClick={handleManualAdd}
          disabled={!manualCode.trim() || submitLocked}
        >
          เพิ่ม
        </Button>
      </div>

      {/* Scanned list */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          สแกนแล้ว ({scannedQty} ชิ้น)
        </h2>
        <CoverScanList covers={scannedCovers} onRemove={removeCode} readOnly={submitLocked} />
      </Card>

      {/* Photo capture */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">ถ่ายภาพประกอบ</p>
        <PhotoCapture value={photo} onChange={setPhoto} disabled={submitLocked} />
      </div>

      {/* Submit */}
      {!confirmOpen ? (
        <Button
          size="xl"
          fullWidth
          disabled={scannedQty === 0 || submitLocked}
          onClick={() => setConfirmOpen(true)}
          leftIcon={<CheckCircle2 className="w-5 h-5" />}
        >
          {submitLocked ? 'กำลังบันทึกงานติดตั้ง...' : `ยืนยันการติดตั้ง (${scannedQty} ชิ้น)`}
        </Button>
      ) : (
        <Card className="bg-pea-50 border-pea-200 space-y-3">
          <p className="text-sm font-semibold text-pea-900 text-center">
            ยืนยันการติดตั้งฉนวน {scannedQty} ชิ้น?
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setConfirmOpen(false)} disabled={submitLocked}>
              ยกเลิก
            </Button>
            <Button
              size="lg"
              className="flex-1"
              loading={submitLocked}
              disabled={submitLocked}
              onClick={() => void handleSubmit()}
            >
              ยืนยัน
            </Button>
          </div>
          {submitInstall.isError && (
            <p role="alert" className="text-xs text-red-600 text-center">
              {submitInstall.error instanceof ApiError
                ? submitInstall.error.message
                : 'เกิดข้อผิดพลาด กรุณาลองใหม่'}
            </p>
          )}
        </Card>
      )}
    </div>
    {feedback && (
      <FeedbackDialog
        open
        tone={feedback.tone}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          const close = feedback.onClose
          setFeedback(null)
          close?.()
        }}
      />
    )}
    </>
  )
}
