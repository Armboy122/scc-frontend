'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useOfficeStock } from '@/hooks/useStock'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { GpsPicker, type GpsCoords } from '@/components/feature/GpsPicker'
import { ApiError } from '@/lib/api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    customerName: z.string().min(1, 'กรุณากรอกชื่อลูกค้า'),
    customerPhone: z.string().optional(),
    installDate: z.string().min(1, 'กรุณาเลือกวันติดตั้ง'),
    removalDate: z.string().min(1, 'กรุณาเลือกวันถอด'),
    plannedQty: z.coerce.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
    note: z.string().optional(),
  })
  .refine((v) => new Date(v.removalDate) > new Date(v.installDate), {
    message: 'วันถอดต้องหลังวันติดตั้ง',
    path: ['removalDate'],
  })

type NewWorkOrderForm = z.infer<typeof schema>

function toApiDate(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toISOString()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewWorkOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const createMutation = useCreateWorkOrder()
  const { data: stock } = useOfficeStock(user?.officeId ?? '')
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewWorkOrderForm>({
    resolver: zodResolver(schema),
    defaultValues: { plannedQty: 1 },
  })

  const installDate = watch('installDate')
  const removalDate = watch('removalDate')
  const plannedQty = watch('plannedQty')

  const rentalDays =
    installDate && removalDate
      ? Math.max(
          0,
          Math.round(
            (new Date(removalDate).getTime() - new Date(installDate).getTime()) / 86_400_000,
          ),
        )
      : null

  const inStock = stock?.inStock ?? null
  const stockWarning = inStock !== null && plannedQty > inStock

  const onSubmit = async (data: NewWorkOrderForm) => {
    if (!user?.officeId) return

    try {
      const res = await createMutation.mutateAsync({
        officeId: user.officeId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        installDate: toApiDate(data.installDate),
        removalDate: toApiDate(data.removalDate),
        plannedQty: data.plannedQty,
        note: data.note,
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

  // Redirect non-authorised roles
  useEffect(() => {
    if (user && user.role === 'tech') {
      router.replace('/')
    }
  }, [user, router])

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
              คลังของสำนักงาน: <strong>{stock.inStock}</strong> ชิ้น
            </p>
            {stockWarning && (
              <p className="text-xs text-orange-700 mt-0.5">
                จำนวนที่ต้องการเกินกว่าสต็อกในคลัง
              </p>
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

        <Input
          label="เบอร์โทรลูกค้า"
          type="tel"
          inputMode="tel"
          error={errors.customerPhone?.message}
          {...register('customerPhone')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="วันติดตั้ง"
            type="date"
            required
            error={errors.installDate?.message}
            {...register('installDate')}
          />
          <div>
            <Input
              label="วันถอด"
              type="date"
              required
              error={errors.removalDate?.message}
              {...register('removalDate')}
            />
            {rentalDays !== null && rentalDays > 0 && (
              <p className="text-xs text-gray-500 mt-1">เช่า {rentalDays} วัน</p>
            )}
          </div>
        </div>

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

        <div className="flex gap-3 pt-2">
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
            disabled={!user?.officeId}
            loading={isSubmitting || createMutation.isPending}
            className="flex-1"
          >
            สร้างใบงาน
          </Button>
        </div>
      </form>
    </div>
  )
}
