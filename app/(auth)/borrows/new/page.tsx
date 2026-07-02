'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, PackageCheck } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useCreateBorrow } from '@/hooks/useBorrows'
import { useStock } from '@/hooks/useStock'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const schema = z
  .object({
    toOfficeId: z.string().min(1, 'กรุณาเลือกสำนักงานที่จะยืมจาก'),
    qty: z.coerce.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
    borrowDate: z.string().min(1, 'กรุณาเลือกวันยืม'),
    returnDate: z.string().min(1, 'กรุณาเลือกวันคืน'),
  })
  .refine((v) => new Date(v.returnDate) > new Date(v.borrowDate), {
    message: 'วันคืนต้องหลังวันยืม',
    path: ['returnDate'],
  })

type BorrowForm = z.infer<typeof schema>

export default function NewBorrowPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: stockList = [], isLoading: stockLoading } = useStock()
  const createBorrow = useCreateBorrow()

  const availableOffices = useMemo(
    () =>
      stockList
        .filter((stock) => stock.officeId !== user?.officeId)
        .sort((a, b) => b.inStock - a.inStock),
    [stockList, user?.officeId],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BorrowForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      qty: 1,
      borrowDate: new Date().toISOString().slice(0, 10),
    },
  })

  const selectedOfficeId = watch('toOfficeId')
  const qty = watch('qty')
  const selectedOffice = availableOffices.find((office) => office.officeId === selectedOfficeId)
  const stockAfterBorrow = selectedOffice ? selectedOffice.inStock - Number(qty || 0) : null

  const onSubmit = async (data: BorrowForm) => {
    try {
      const res = await createBorrow.mutateAsync(data)
      router.replace(res.data ? `/borrows/${res.data.id}` : '/borrows')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="page-padding max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">สร้างใบยืม</h1>
          <p className="text-sm text-gray-500 mt-0.5">บันทึกหลังตกลงยืมนอกระบบแล้ว</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Select
            label="ยืมจากสำนักงาน"
            required
            placeholder={stockLoading ? 'กำลังโหลดสำนักงาน...' : 'เลือกสำนักงาน'}
            options={availableOffices.map((stock) => ({
              value: stock.officeId,
              label: `${stock.office?.name ?? stock.officeId} - พร้อมใช้ ${stock.inStock} ชิ้น`,
            }))}
            error={errors.toOfficeId?.message}
            {...register('toOfficeId')}
          />

          <Input
            label="จำนวนที่ยืม"
            type="number"
            min={1}
            inputMode="numeric"
            required
            error={errors.qty?.message}
            {...register('qty')}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="วันไปยืม"
              type="date"
              required
              error={errors.borrowDate?.message}
              {...register('borrowDate')}
            />
            <Input
              label="วันคืน"
              type="date"
              required
              error={errors.returnDate?.message}
              {...register('returnDate')}
            />
          </div>

          {createBorrow.error instanceof ApiError && (
            <p role="alert" className="text-sm text-red-600">
              {createBorrow.error.message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="sm:flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting || createBorrow.isPending}
              className="sm:flex-1"
              leftIcon={<ArrowRight className="w-5 h-5" />}
            >
              ส่งคำขอยืม
            </Button>
          </div>
        </form>

        <Card className="h-fit">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="w-5 h-5 text-pea-600" aria-hidden />
            <h2 className="font-semibold text-gray-900">ผลกระทบสต็อก</h2>
          </div>
          {selectedOffice ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">สำนักงานต้นทาง</dt>
                <dd className="font-medium text-right">{selectedOffice.office?.name ?? selectedOffice.officeId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">พร้อมใช้ก่อนยืม</dt>
                <dd className="font-mono font-bold">{selectedOffice.inStock}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">หลังอนุมัติ</dt>
                <dd
                  className={[
                    'font-mono font-bold',
                    stockAfterBorrow !== null && stockAfterBorrow < 0 ? 'text-red-700' : 'text-green-700',
                  ].join(' ')}
                >
                  {stockAfterBorrow}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">เลือกสำนักงานเพื่อดูจำนวนคงเหลือหลังให้ยืม</p>
          )}
        </Card>
      </div>
    </div>
  )
}
