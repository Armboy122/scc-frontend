'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import {
  useCompleteRemoval,
  useRemovalProgress,
  useScanRemove,
  useWorkOrder,
} from '@/hooks/useWorkOrders'
import { triggerScanFeedback } from '@/lib/scanFeedback'
import { QrScanner } from '@/components/feature/QrScanner'
import { CoverScanList, type ScannedCover } from '@/components/feature/CoverScanList'
import { PhotoCapture } from '@/components/feature/PhotoCapture'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'

const ignoreRemove = () => {}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function RemovePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: order, isLoading: isWorkOrderLoading } = useWorkOrder(id)
  const {
    data: removalProgress = [],
    error: removalProgressError,
    isFetching: isRemovalProgressFetching,
    isLoading: isRemovalProgressLoading,
  } = useRemovalProgress(id, order?.installations)
  const scanRemove = useScanRemove()
  const completeRemoval = useCompleteRemoval()

  const [manualCode, setManualCode] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanFeedback, setScanFeedback] = useState<{
    tone: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)
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

  const removedCovers: ScannedCover[] = removalProgress.flatMap((cover) =>
    cover.removedAt
      ? [{
          code: cover.code,
          coverId: cover.coverId,
          scannedAt: new Date(cover.removedAt),
        }]
      : [],
  )
  const totalQty = removalProgress.length
  const removedQty = removedCovers.length
  const allRemoved = totalQty > 0 && removedQty === totalQty
  const usesCoverIdFallback = removalProgress.some((cover) => cover.usesCoverIdFallback)
  const progress = totalQty > 0 ? removedQty / totalQty : 0
  const removalBusy = scanRemove.isPending || isRemovalProgressFetching
  const submitLocked = isSubmittingRemove
    || completeRemoval.isPending
    || removalBusy
    || Boolean(removalProgressError)
    || order?.status !== 'REMOVING'

  const addCode = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed || removalBusy || submitLocked) return

    const alreadyRemovedBeforeScan = removalProgress.some((cover) =>
      Boolean(cover.removedAt)
      && (cover.code === trimmed || cover.coverId === trimmed),
    )

    try {
      const cover = await scanRemove.mutateAsync({ id, coverCode: trimmed })
      const alreadyRemoved = alreadyRemovedBeforeScan || removalProgress.some((item) =>
        item.coverId === cover.id && Boolean(item.removedAt),
      )
      const message = alreadyRemoved
        ? `รหัส ${cover.assetCode} ถอดแล้ว ระบบยืนยันรายการเดิม`
        : `บันทึกการถอด ${cover.assetCode} แล้ว`
      const tone = alreadyRemoved ? 'warning' : 'success'
      setScanError(null)
      setScanFeedback({ tone, message })
      triggerScanFeedback({ tone })
    } catch (error) {
      const message = errorMessage(error, 'บันทึกการถอดไม่สำเร็จ กรุณาลองใหม่')
      setScanError(message)
      setScanFeedback({ tone: 'error', message })
      triggerScanFeedback({ tone: 'error' })
    }
  }

  const handleManualAdd = () => {
    void addCode(manualCode)
    setManualCode('')
  }

  const handleSubmit = async () => {
    if (isSubmittingRemove || completeRemoval.isPending) return
    if (!allRemoved) {
      const message = 'ยังถอดครอบฉนวนไม่ครบ ระบบจึงยังปิดใบงานไม่ได้'
      setFeedback({ tone: 'error', title: 'ถอดยังไม่ครบ', message })
      setConfirmOpen(false)
      return
    }
    if (!photo) {
      const message = 'กรุณาถ่ายรูปหลักฐานก่อนปิดงาน'
      setScanFeedback({ tone: 'error', message })
      triggerScanFeedback({ tone: 'error' })
      setFeedback({ tone: 'error', title: 'ยังไม่มีรูปหลักฐาน', message })
      setConfirmOpen(false)
      return
    }

    setIsSubmittingRemove(true)
    try {
      await completeRemoval.mutateAsync({
        id,
        payload: {
          installations: order?.installations ?? [],
          photoFile: photo,
        },
      })
      setFeedback({
        tone: 'success',
        title: 'ปิดงานสำเร็จ',
        message: `ถอดฉนวนครบ ${removedQty} ชิ้น อัปโหลดหลักฐานและปิดใบงานแล้ว`,
        onClose: () => {
          router.refresh()
          router.replace(`/workorders/${id}`)
        },
      })
    } catch (error) {
      const message = errorMessage(error, 'ปิดงานไม่สำเร็จ กรุณาลองใหม่')
      setScanFeedback({ tone: 'error', message })
      triggerScanFeedback({ tone: 'error' })
      setFeedback({
        tone: 'error',
        title: 'ปิดงานไม่สำเร็จ',
        message: `${message} รายการที่ถอดไว้ยังคงอยู่ ไม่ต้องสแกนซ้ำ`,
      })
      setIsSubmittingRemove(false)
    } finally {
      setConfirmOpen(false)
    }
  }

  if (isWorkOrderLoading || (order && isRemovalProgressLoading)) {
    return (
      <div className="page-padding mx-auto max-w-lg" aria-label="กำลังโหลดความคืบหน้าการถอด">
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    )
  }

  if (!order) return null

  const scanFeedbackClass = scanFeedback?.tone === 'success'
    ? 'border-green-200 bg-green-50 text-green-800'
    : scanFeedback?.tone === 'warning'
      ? 'border-orange-200 bg-orange-50 text-orange-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <>
      <div className="page-padding mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="-ml-2 rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" aria-hidden />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ถอดฉนวน</h1>
            <p className="text-sm text-gray-500">{order.customerName}</p>
          </div>
        </div>

        <Card padding="sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">ถอดแล้ว</span>
            <span className={['text-sm font-bold tabular-nums', allRemoved ? 'text-green-600' : 'text-orange-600'].join(' ')}>
              {removedQty} / {totalQty} ชิ้น
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-gray-100"
            role="progressbar"
            aria-label="ความคืบหน้าการถอด"
            aria-valuenow={removedQty}
            aria-valuemax={totalQty}
          >
            <div
              className={['h-2 rounded-full transition-all duration-300', allRemoved ? 'bg-green-500' : 'bg-orange-500'].join(' ')}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {!allRemoved && (
            <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" aria-hidden />
              ถอดไม่ครบปิดงานไม่ได้ — ความคืบหน้านับจากรายการบน server
            </p>
          )}
        </Card>

        <QrScanner onScan={(code) => { void addCode(code) }} />
        {removalProgressError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            โหลดรายการที่ถอดไว้ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่ก่อนทำงานต่อ
          </div>
        )}
        {scanFeedback && (
          <div className={['rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm', scanFeedbackClass].join(' ')} role="status">
            {scanFeedback.message}
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="ป้อนรหัสด้วยตนเอง"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleManualAdd()
                }
              }}
              error={scanError ?? undefined}
              disabled={submitLocked}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-12 flex-shrink-0 self-start"
            onClick={handleManualAdd}
            disabled={!manualCode.trim() || submitLocked}
            loading={scanRemove.isPending}
          >
            บันทึกการถอด
          </Button>
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            ถอดแล้ว ({removedQty} ชิ้น)
          </h2>
          {usesCoverIdFallback && (
            <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-blue-50 p-2 text-xs text-blue-700" role="status">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              บางรายการโหลดรหัสทรัพย์สินไม่ได้ จึงแสดง cover ID จาก server แทน
            </p>
          )}
          <CoverScanList covers={removedCovers} onRemove={ignoreRemove} readOnly />
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            รูปหลักฐานถอด <span className="text-red-500">*</span>
          </p>
          <PhotoCapture value={photo} onChange={setPhoto} disabled={submitLocked} />
          <p className="mt-2 text-xs text-gray-500">
            อัปโหลดและผูกรูปกับรายการที่ server ยืนยันว่าถอดแล้วก่อนปิดงาน
          </p>
        </div>

        {!confirmOpen ? (
          <div className="space-y-2">
            <Button
              size="xl"
              fullWidth
              disabled={!allRemoved || !photo || submitLocked}
              onClick={() => setConfirmOpen(true)}
              leftIcon={<CheckCircle2 className="h-5 w-5" />}
            >
              {submitLocked ? 'กำลังประมวลผล...' : `ปิดงาน (${removedQty}/${totalQty} ชิ้น)`}
            </Button>
            {!allRemoved && (
              <p className="text-center text-xs text-gray-400">
                ต้องถอดรายการบน server ให้ครบ {totalQty} ชิ้น จึงจะปิดงานได้
              </p>
            )}
          </div>
        ) : (
          <Card className="space-y-3 border-green-200 bg-green-50">
            <p className="text-center text-sm font-semibold text-green-900">
              ยืนยันอัปโหลดหลักฐานและปิดใบงาน?
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
                disabled={submitLocked}
              >
                ยกเลิก
              </Button>
              <Button
                size="lg"
                className="flex-1"
                loading={submitLocked}
                disabled={submitLocked}
                onClick={() => { void handleSubmit() }}
              >
                ปิดงาน
              </Button>
            </div>
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
