'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Download, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRegisterCover } from '@/hooks/useCovers'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError } from '@/lib/api'
import { createCoverLabelSvg, downloadSvg, svgToDataUrl } from '@/lib/qr'
import type { Cover } from '@/lib/types'

const schema = z.object({
  assetCode: z.string().min(1, 'กรุณากรอกรหัสทรัพย์สิน'),
  nfcId: z.string().optional(),
  ownerOfficeId: z.string().min(1, 'กรุณากรอกรหัสสำนักงาน'),
})

type RegisterForm = z.infer<typeof schema>

function buildQrCode(ownerOfficeId: string, assetCode: string): string {
  if (!ownerOfficeId.trim() || !assetCode.trim()) return 'ระบบจะสร้างหลังกรอกรหัสทรัพย์สินและสำนักงาน'
  return `SCC:${ownerOfficeId.trim()}:${assetCode.trim()}`
}

export default function RegisterCoverPage() {
  const { user } = useAuth()
  const router = useRouter()
  const registerCover = useRegisterCover()
  const [createdCover, setCreatedCover] = useState<Cover | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { ownerOfficeId: user?.officeId ?? '' },
  })
  const assetCode = watch('assetCode') ?? ''
  const ownerOfficeId = watch('ownerOfficeId') ?? ''

  useEffect(() => {
    if (user?.officeId) {
      setValue('ownerOfficeId', user.role === 'admin' ? ownerOfficeId || user.officeId : user.officeId)
    }
  }, [ownerOfficeId, setValue, user])

  const onSubmit = async (data: RegisterForm) => {
    try {
      const payload = {
        ...data,
        ownerOfficeId: user?.role === 'admin' ? data.ownerOfficeId : user?.officeId ?? data.ownerOfficeId,
      }
      const res = await registerCover.mutateAsync(payload)
      if (res.data) {
        setCreatedCover(res.data)
        reset({
          assetCode: '',
          nfcId: '',
          ownerOfficeId: payload.ownerOfficeId,
        })
      }
    } catch {
      // shown via mutation.error
    }
  }

  return (
    <div className="page-padding max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ลงทะเบียนฉนวน</h1>
          <p className="text-sm text-gray-500">เพิ่มฉนวนใหม่เข้าระบบ</p>
        </div>
      </div>

      {createdCover && (
        <Card className="mb-4 text-center">
          <img
            src={svgToDataUrl(createCoverLabelSvg(createdCover))}
            alt={`QR Code ${createdCover.assetCode}`}
            className="mx-auto w-56 h-auto"
          />
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => downloadSvg(`cover-${createdCover.assetCode}.svg`, createCoverLabelSvg(createdCover))}
            >
              โหลด QR
            </Button>
            <Button
              type="button"
              className="flex-1"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setCreatedCover(null)}
            >
              ลงต่อ
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="รหัสทรัพย์สิน (Asset Code)"
            placeholder="PEA-XXXX-XXXX"
            required
            error={errors.assetCode?.message}
            {...register('assetCode')}
          />

          <Input
            label="QR Code ที่ระบบจะสร้าง"
            value={buildQrCode(ownerOfficeId, assetCode)}
            readOnly
          />

          <Input
            label="NFC ID (ถ้ามี)"
            placeholder="รหัส NFC"
            error={errors.nfcId?.message}
            {...register('nfcId')}
          />

          <Input
            label="รหัสสำนักงานเจ้าของ"
            placeholder="Office ID"
            required
            readOnly={user?.role !== 'admin'}
            error={errors.ownerOfficeId?.message}
            {...register('ownerOfficeId')}
          />

          {registerCover.error instanceof ApiError && (
            <p role="alert" className="text-sm text-red-600 text-center">
              {registerCover.error.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1">
              ยกเลิก
            </Button>
            <Button type="submit" size="lg" loading={isSubmitting || registerCover.isPending} className="flex-1">
              ลงทะเบียน
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/covers/register/batch')}
          className="text-sm text-pea-600 hover:text-pea-700 font-medium"
        >
          ลงทะเบียนหลายรายการ →
        </button>
      </div>
    </div>
  )
}
