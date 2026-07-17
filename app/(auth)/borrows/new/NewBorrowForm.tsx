'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, PackageCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  bangkokTodayDateInput,
  isFutureThaiBusinessDate,
  isValidDateInput,
  requestedQtyPrefillToNumber,
  returnDatePrefillToDateInput,
  thaiDateInputToEndOfDayRfc3339,
} from '@/lib/borrowDate'
import { useAuth } from '@/lib/auth'
import { useBorrowAvailability, useCreateBorrow } from '@/hooks/useBorrows'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const schema = z.object({
  lenderOfficeId: z.string().min(1, 'กรุณาเลือกสำนักงานผู้ให้ยืม'),
  requestedQty: z.coerce.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
  returnDate: z.string()
    .refine(isValidDateInput, 'กรุณาเลือกวันคืนที่ถูกต้อง')
    .refine(isFutureThaiBusinessDate, 'กำหนดคืนต้องอยู่ในอนาคต'),
  note: z.string().trim().max(500, 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร').optional(),
})

type BorrowForm = z.infer<typeof schema>
export type BorrowSearchParams = {
  requestedQty?: string | string[]
  returnDate?: string | string[]
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function NewBorrowForm({ query }: { query: BorrowSearchParams }) {
  const router = useRouter()
  const { user } = useAuth()
  const canCreate = user?.role === 'exec' || user?.role === 'tech'
  const {
    data: availability = [],
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useBorrowAvailability(canCreate)
  const createBorrow = useCreateBorrow()

  const availableLenders = useMemo(
    () => [...availability]
      .filter((item) => item.borrowableCapacity > 0)
      .sort((a, b) => (
        b.borrowableCapacity - a.borrowableCapacity
        || a.office.name.localeCompare(b.office.name, 'th')
      )),
    [availability],
  )
  const lenderOptions = useMemo(
    () => availableLenders.map((item) => ({
      value: item.office.id,
      label: `${item.office.name} — ยืมได้ ${item.borrowableCapacity} ชิ้น`,
    })),
    [availableLenders],
  )

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BorrowForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      lenderOfficeId: '',
      requestedQty: requestedQtyPrefillToNumber(firstQueryValue(query.requestedQty)) ?? 1,
      returnDate: returnDatePrefillToDateInput(firstQueryValue(query.returnDate)) ?? '',
      note: '',
    },
  })

  const selectedOfficeId = watch('lenderOfficeId')
  const requestedQty = Number(watch('requestedQty') || 0)
  const selectedLender = availableLenders.find((item) => item.office.id === selectedOfficeId)
  const capacityAfterRequest = selectedLender
    ? selectedLender.borrowableCapacity - requestedQty
    : null

  const onSubmit = async (data: BorrowForm) => {
    const lender = availableLenders.find((item) => item.office.id === data.lenderOfficeId)
    if (!lender) {
      setError('lenderOfficeId', { message: 'สำนักงานนี้ไม่มีจำนวนที่เปิดให้ยืมแล้ว' })
      return
    }
    if (data.requestedQty > lender.borrowableCapacity) {
      setError('requestedQty', {
        message: `ขอได้ไม่เกิน ${lender.borrowableCapacity} ชิ้นตามจำนวนที่เปิดให้ยืม`,
      })
      return
    }

    clearErrors()
    try {
      const borrow = await createBorrow.mutateAsync({
        lenderOfficeId: data.lenderOfficeId,
        requestedQty: data.requestedQty,
        returnDate: thaiDateInputToEndOfDayRfc3339(data.returnDate),
        ...(data.note?.trim() ? { note: data.note.trim() } : {}),
      })
      router.replace(`/borrows/${borrow.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') {
        // Availability is intentionally only a snapshot. Refresh it after a
        // server-side recheck fails so the form cap immediately converges on
        // the lender's latest capacity.
        await refetchAvailability()
        setError('requestedQty', {
          message: 'จำนวนคงเหลือเปลี่ยนแล้ว กรุณาตรวจสอบจำนวนล่าสุดก่อนส่งอีกครั้ง',
        })
      }
      // The mutation exposes the canonical API error below the form.
    }
  }

  if (!canCreate) {
    return (
      <div className="page-padding max-w-xl mx-auto py-12">
        <Card className="border-blue-200 bg-blue-50 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-blue-600" aria-hidden />
          <h1 className="mt-3 text-lg font-bold text-blue-950">หน้านี้เป็นโหมดอ่านอย่างเดียว</h1>
          <p className="mt-2 text-sm text-blue-800">
            ผู้ดูแลระบบดูใบยืมทั้งหมดได้ แต่ไม่สามารถสร้างคำขอแทนสำนักงานได้
          </p>
          <Link
            href="/borrows"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-blue-300 bg-white px-4 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            กลับไปหน้าใบยืม
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-padding max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">สร้างใบยืม</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ระบบจะเลือกและจองฉนวนที่พร้อมยืมให้ตามจำนวนที่ขอ
          </p>
        </div>
      </div>

      {availabilityLoading && (
        <div className="card-surface mb-4 h-24 animate-pulse bg-gray-100" aria-label="กำลังโหลดจำนวนที่เปิดให้ยืม" />
      )}

      {!availabilityLoading && availabilityError && (
        <div role="alert" className="card-surface mb-4 p-5 text-center">
          <p className="text-sm font-medium text-red-600">
            ไม่สามารถโหลดจำนวนที่เปิดให้ยืมจากสำนักงานอื่นได้
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            loading={availabilityFetching}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void refetchAvailability()}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {!availabilityLoading && !availabilityError && availableLenders.length === 0 && (
        <div className="card-surface mb-4 p-5 text-center text-sm text-gray-600">
          ขณะนี้ยังไม่มีสำนักงานอื่นที่มีจำนวนเปิดให้ยืม
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-5" noValidate>
          <Select
            label="สำนักงานผู้ให้ยืม"
            required
            disabled={availabilityLoading || Boolean(availabilityError) || availableLenders.length === 0}
            placeholder={availabilityLoading ? 'กำลังโหลดสำนักงาน...' : 'เลือกสำนักงาน'}
            options={lenderOptions}
            error={errors.lenderOfficeId?.message}
            {...register('lenderOfficeId', {
              onChange: () => clearErrors(['lenderOfficeId', 'requestedQty']),
            })}
          />

          <Input
            label="จำนวนที่ขอ"
            type="number"
            min={1}
            max={selectedLender?.borrowableCapacity}
            inputMode="numeric"
            required
            error={errors.requestedQty?.message}
            hint={selectedLender ? `สำนักงานนี้เปิดให้ยืมได้ ${selectedLender.borrowableCapacity} ชิ้น` : undefined}
            {...register('requestedQty', {
              onChange: () => clearErrors('requestedQty'),
            })}
          />

          <Input
            label="กำหนดคืน"
            type="date"
            min={bangkokTodayDateInput()}
            required
            error={errors.returnDate?.message}
            hint="ระบบจะส่งเป็นเวลา 23:59:59 น. ตามเวลาประเทศไทย"
            {...register('returnDate')}
          />

          <Textarea
            label="หมายเหตุ"
            maxLength={500}
            error={errors.note?.message}
            placeholder="ข้อมูลประกอบคำขอ (ถ้ามี)"
            {...register('note')}
          />

          {createBorrow.error && (
            <p role="alert" className="text-sm text-red-600">
              {createBorrow.error instanceof ApiError
                ? createBorrow.error.message
                : 'ส่งคำขอไม่สำเร็จ กรุณาตรวจสอบจำนวนล่าสุดแล้วลองอีกครั้ง'}
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
              disabled={availabilityLoading || Boolean(availabilityError) || availableLenders.length === 0}
              className="sm:flex-1"
              leftIcon={<ArrowRight className="w-5 h-5" />}
            >
              ส่งคำขอยืม
            </Button>
          </div>
        </form>

        <Card className="h-fit min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="w-5 h-5 text-pea-600" aria-hidden />
            <h2 className="font-semibold text-gray-900">จำนวนที่เปิดให้ยืม</h2>
          </div>
          {selectedLender ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">สำนักงาน</dt>
                <dd className="min-w-0 break-words text-right font-medium">
                  {selectedLender.office.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">ฉนวนเจ้าของพร้อมคลัง</dt>
                <dd className="font-mono font-bold">{selectedLender.ownedInStock}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">จองแผนงาน</dt>
                <dd className="font-mono font-bold">{selectedLender.reservedPlanned}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">จองใบยืมอื่น</dt>
                <dd className="font-mono font-bold">{selectedLender.reservedBorrow}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-gray-100 pt-3">
                <dt className="text-gray-500">ยืมได้ก่อนคำขอ</dt>
                <dd className="font-mono font-bold">{selectedLender.borrowableCapacity}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">คงเหลือหลังจอง</dt>
                <dd className={[
                  'font-mono font-bold',
                  capacityAfterRequest !== null && capacityAfterRequest < 0
                    ? 'text-red-700'
                    : 'text-green-700',
                ].join(' ')}>
                  {capacityAfterRequest}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">
              เลือกสำนักงานเพื่อดูจำนวนหลังหักแผนงานและคำขอยืมที่ยังไม่ปล่อยจอง
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
