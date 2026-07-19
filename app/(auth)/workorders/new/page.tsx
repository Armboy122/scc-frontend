'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useOfficeStock } from '@/hooks/useStock'
import { Input } from '@/components/ui/Input'
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { GpsPicker, type GpsCoords } from '@/components/feature/GpsPicker'
import { ApiError } from '@/lib/api'
import { PHASE_FEATURE_FLAGS } from '@/lib/featureFlags'
import { thaiDateInputToStartOfDayRfc3339 } from '@/lib/thaiDate'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    customerName: z.string().min(1, 'กรุณากรอกชื่อลูกค้า'),
    requestNumber: z.string().optional(),
    customerPhone: z.string().optional(),
    installDate: z.string().min(1, 'กรุณาเลือกวันติดตั้ง'),
    removalDate: z.string().min(1, 'กรุณาเลือกวันถอด'),
    plannedQty: z.coerce.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
    note: z.string().optional(),
    usageType: z.enum(['CUSTOMER_COVER', 'INTERNAL']),
  })
  .refine((v) => new Date(v.removalDate) > new Date(v.installDate), {
    message: 'วันถอดต้องหลังวันติดตั้ง',
    path: ['removalDate'],
  })

type NewWorkOrderForm = z.infer<typeof schema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewWorkOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const createMutation = useCreateWorkOrder()
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NewWorkOrderForm>({
    resolver: zodResolver(schema),
    defaultValues: { plannedQty: 1, usageType: 'CUSTOMER_COVER' },
  })

  const installDate = watch('installDate')
  const removalDate = watch('removalDate')
  const plannedQty = watch('plannedQty')
  const stockInstallDate = installDate ? thaiDateInputToStartOfDayRfc3339(installDate) : undefined
  const { data: stock } = useOfficeStock(user?.officeId ?? '', stockInstallDate)

  const rentalDays =
    installDate && removalDate
      ? Math.max(
          0,
          Math.round(
            (new Date(removalDate).getTime() - new Date(installDate).getTime()) / 86_400_000,
          ),
        )
      : null

  const availableForWorkOrder = stock?.availableForWorkOrder ?? stock?.inStock ?? null
  const stockWarning = availableForWorkOrder !== null && plannedQty > availableForWorkOrder
  const stockShortfall = stockWarning && availableForWorkOrder !== null
    ? plannedQty - availableForWorkOrder
    : 0
  const borrowPrefillParams = new URLSearchParams({ requestedQty: String(stockShortfall) })
  if (removalDate) borrowPrefillParams.set('returnDate', removalDate)

  const onSubmit = async (data: NewWorkOrderForm) => {
    if (!user?.officeId) return

    try {
      const res = await createMutation.mutateAsync({
        officeId: user.officeId,
        customerName: data.customerName,
        requestNumber: data.requestNumber || undefined,
        customerPhone: data.customerPhone,
        installDate: thaiDateInputToStartOfDayRfc3339(data.installDate),
        removalDate: thaiDateInputToStartOfDayRfc3339(data.removalDate),
        plannedQty: data.plannedQty,
        note: data.note,
        usageType: data.usageType,
        ...(gpsCoords ? { gpsLat: gpsCoords.latitude, gpsLng: gpsCoords.longitude } : {}),
      })
      if (res.data) {
        router.replace(`/workorders/${res.data.id}`)
      }
    } catch (err) {
      // Error displayed inline via mutation state
      console.error(err)
    }
  }

  return (
    <div className="page-padding max-w-lg mx-auto">
      {/* Back header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <h1 className="text-xl font-bold text-gray-900">สร้างใบงานใหม่</h1>
      </div>

      {/* Stock indicator */}
      {stock && (
        <div
          className={[
            'card-surface p-3 mb-5 flex items-center gap-3',
            stockWarning ? 'border-orange-300 bg-orange-50' : 'bg-green-50 border-green-200',
          ].join(' ')}
        >
          {stockWarning && (
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" aria-hidden />
          )}
          <div>
            <p className={['text-sm font-medium', stockWarning ? 'text-orange-800' : 'text-green-800'].join(' ')}>
              ฉนวนพร้อมติดตั้งหลังหักใบงานรอติดตั้ง: <strong>{availableForWorkOrder}</strong> ชิ้น
            </p>
            {stock.reservedPlanned > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">
                พร้อมติดตั้งจริง {stock.inStock} ชิ้น · กันไว้ในใบงานรอติดตั้ง {stock.reservedPlanned} ชิ้น
              </p>
            )}
            {stockWarning && (
              <div className="mt-1.5">
                <p className="text-xs text-orange-700">
                  จำนวนที่ต้องการเกินกว่าคงเหลือหลังหักใบงานรอติดตั้ง
                </p>
                {PHASE_FEATURE_FLAGS.phase2Borrowing && stockShortfall > 0 && (
                  <Link
                    href={`/borrows/new?${borrowPrefillParams.toString()}`}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    ขอยืมเพิ่ม {stockShortfall} ชิ้น
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="ชื่อลูกค้า"
          required
          error={errors.customerName?.message}
          {...register('customerName')}
        />

        <Input label="เลขที่ใบคำร้อง" hint="ไม่บังคับ — เพิ่มหรือแก้ไขภายหลังได้" error={errors.requestNumber?.message} {...register('requestNumber')} />

        <Select label="ประเภทการใช้งาน" options={[{ value: 'CUSTOMER_COVER', label: 'งานครอบให้ผู้ใช้ไฟฟ้า' }, { value: 'INTERNAL', label: 'ใช้งานภายใน' }]} {...register('usageType')} />

        <Input
          label="เบอร์โทรลูกค้า"
          type="tel"
          inputMode="tel"
          error={errors.customerPhone?.message}
          {...register('customerPhone')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller name="installDate" control={control} render={({ field }) => (
            <ThaiDatePicker label="วันติดตั้ง" required value={field.value} onChange={field.onChange} error={errors.installDate?.message} />
          )} />
          <div>
            <Controller name="removalDate" control={control} render={({ field }) => (
              <ThaiDatePicker label="วันถอด" required value={field.value} onChange={field.onChange} error={errors.removalDate?.message} />
            )} />
            {rentalDays !== null && rentalDays > 0 && (
              <p className="text-xs text-gray-500 mt-1">เช่า {rentalDays} วัน</p>
            )}
          </div>
        </div>
        <p className="-mt-3 text-xs text-gray-500">เลือกวันในรูปแบบ พ.ศ. — ระบบจะเก็บและส่งข้อมูลเป็น ค.ศ. มาตรฐานเดิม</p>

        <Input
          label="จำนวนฉนวน (ชิ้น)"
          type="number"
          inputMode="numeric"
          min={1}
          required
          error={errors.plannedQty?.message}
          {...register('plannedQty')}
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">ตำแหน่ง GPS</p>
          <GpsPicker onChange={setGpsCoords} />
        </div>

        <Textarea
          label="หมายเหตุ"
          placeholder="รายละเอียดเพิ่มเติม..."
          error={errors.note?.message}
          {...register('note')}
        />

        {createMutation.error instanceof ApiError && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {createMutation.error.message}
          </p>
        )}

        {!user?.officeId && (
          <p role="alert" className="text-sm text-red-600 text-center">
            ผู้ใช้ต้องสังกัดสำนักงานก่อนสร้างใบงาน
          </p>
        )}

        <div className="pt-2">
          {stockWarning && (
            <p role="status" className="mb-2 text-center text-sm font-medium text-orange-800">
              ยังสร้างใบงานไม่ได้: สต็อกขาด {stockShortfall} ชิ้น
            </p>
          )}
          <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="flex-1"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!user?.officeId || stockWarning}
            loading={isSubmitting || createMutation.isPending}
            className="flex-1"
          >
            สร้างใบงาน
          </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
