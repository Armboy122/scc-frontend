'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useWorkOrder, useSubmitRemove } from '@/hooks/useWorkOrders'
import { ApiError } from '@/lib/api'
import { triggerScanFeedback } from '@/lib/scanFeedback'
import { QrScanner } from '@/components/feature/QrScanner'
import { CoverScanList, type ScannedCover } from '@/components/feature/CoverScanList'
import { PhotoCapture } from '@/components/feature/PhotoCapture'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanFeedback, setScanFeedback] = useState<{ tone: 'success' | 'warning' | 'error'; message: string } | null>(null)
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    title: string
    message: string
    onClose?: () => void
  } | null>(null)

  useEffect(() => {
    if (order && order.status !== 'REMOVING') {
      router.replace(`/workorders/${id}`)
    }
  }, [id, order, router])

  const addCode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    if (removedCovers.some((c) => c.code === trimmed)) {
      const message = `รหัส ${trimmed} สแกนแล้ว`
      setScanError(message)
      setScanFeedback({ tone: 'warning', message })
      triggerScanFeedback({ tone: 'warning' })
      return
    }
    setScanError(null)
    setScanFeedback({ tone: 'success', message: `เพิ่ม ${trimmed} แล้ว` })
    triggerScanFeedback({ tone: 'success' })
    setRemovedCovers((prev) => [...prev, { code: trimmed, scannedAt: new Date() }])
  }

  const handleManualAdd = () => {
    addCode(manualCode)
    setManualCode('')
  }

  const handleSubmit = async () => {
    if (isSubmittingRemove || submitRemove.isPending) return
    if (!photo) {
      const message = 'กรุณาถ่ายรูปหลักฐานก่อนปิดงาน'
      setScanFeedback({ tone: 'error', message })
      triggerScanFeedback({ tone: 'error' })
      setFeedback({
        tone: 'error',
        title: 'ยังไม่มีรูปหลักฐาน',
        message,
      })
      setConfirmOpen(false)
      return
    }

    setIsSubmittingRemove(true)
    try {
      await submitRemove.mutateAsync({
        id,
        payload: {
          coverCodes: removedCovers.map((c) => c.code),
          photoFile: photo,
        },
      })
      setFeedback({
        tone: 'success',
        title: 'ปิดงานสำเร็จ',
        message: `ถอดฉนวนครบ ${removedCovers.length} ชิ้นแล้ว สถานะใบงานจะเปลี่ยนเป็นเสร็จสิ้น`,
        onClose: () => {
          router.refresh()
          router.replace(`/workorders/${id}`)
        },
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setScanFeedback({ tone: 'error', message })
      triggerScanFeedback({ tone: 'error' })
      setFeedback({
        tone: 'error',
        title: 'ปิดงานไม่สำเร็จ',
        message,
      })
      setIsSubmittingRemove(false)
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
  const progress = totalQty > 0 ? Math.min(1, removedQty / totalQty) : 0
  const scanFeedbackClass = scanFeedback?.tone === 'success'
    ? 'border-green-200 bg-green-50 text-green-800'
    : scanFeedback?.tone === 'warning'
      ? 'border-orange-200 bg-orange-50 text-orange-800'
      : 'border-red-200 bg-red-50 text-red-800'
  const submitLocked = isSubmittingRemove || submitRemove.isPending || order.status !== 'REMOVING'

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
          <h1 className="text-lg font-bold text-gray-900">ถอดฉนวน</h1>
          <p className="text-sm text-gray-500">{order.customerName}</p>
        </div>
      </div>

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
      {scanFeedback && (
        <div className={['rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm', scanFeedbackClass].join(' ')} role="status">
          {scanFeedback.message}
        </div>
      )}

      {/* Manual input */}
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

      {/* Removed list */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          ถอดแล้ว ({removedQty} ชิ้น)
        </h2>
        <CoverScanList covers={removedCovers} onRemove={(code) => setRemovedCovers((prev) => prev.filter((c) => c.code !== code))} readOnly={submitLocked} />
      </Card>

      {/* Photo capture */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">รูปหลักฐานถอด <span className="text-red-500">*</span></p>
        <PhotoCapture value={photo} onChange={setPhoto} disabled={submitLocked} />
        <p className="mt-2 text-xs text-gray-500">รูปจะถูกอัปโหลดไป MinIO และผูกกับรายการฉนวนที่ถอดก่อนปิดงาน</p>
      </div>

      {/* Close job button */}
      {!confirmOpen ? (
        <div className="space-y-2">
          <Button
            size="xl"
            fullWidth
            disabled={!allRemoved || !photo || submitLocked}
            onClick={() => setConfirmOpen(true)}
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
          >
            {submitLocked ? 'กำลังปิดงาน...' : `ปิดงาน (${removedQty}/${totalQty} ชิ้น)`}
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
              ปิดงาน
            </Button>
          </div>
          {submitRemove.isError && (
            <p role="alert" className="text-xs text-red-600 text-center">
              {submitRemove.error instanceof ApiError
                ? submitRemove.error.message
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
