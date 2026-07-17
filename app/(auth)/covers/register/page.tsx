'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Download, LoaderCircle, Plus, Radio } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRegisterCover } from '@/hooks/useCovers'
import { useOffices } from '@/hooks/useOffices'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { ApiError } from '@/lib/api'
import { readNdefText, type NdefRecord } from '@/lib/nfc'
import { createCoverLabelSvg, downloadSvg, svgToDataUrl } from '@/lib/qr'
import type { Cover } from '@/lib/types'

const schema = z.object({
  assetCode: z.string().min(1, 'กรุณากรอกรหัสทรัพย์สิน'),
  ownerOfficeId: z.string().min(1, 'กรุณากรอกรหัสสำนักงาน'),
})

type RegisterForm = z.infer<typeof schema>

type NdefReader = {
  scan: () => Promise<void>
  onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null
}

function buildQrCode(ownerOfficeId: string, assetCode: string): string {
  if (!ownerOfficeId.trim() || !assetCode.trim()) return 'ระบบจะสร้างหลังกรอกรหัสทรัพย์สินและสำนักงาน'
  return `SCC:${ownerOfficeId.trim()}:${assetCode.trim()}`
}

export default function RegisterCoverPage() {
  const { user } = useAuth()
  const router = useRouter()
  const registerCover = useRegisterCover()
  const isAdmin = user?.role === 'admin'
  const { data: offices = [], isLoading: isLoadingOffices } = useOffices(isAdmin)
  const [createdCover, setCreatedCover] = useState<Cover | null>(null)
  const [isNfcSupported, setIsNfcSupported] = useState(false)
  const [isScanningNfc, setIsScanningNfc] = useState(false)
  const [nfcError, setNfcError] = useState('')

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
    if (!isAdmin && user?.officeId) {
      setValue('ownerOfficeId', user.officeId)
    }
  }, [isAdmin, setValue, user?.officeId])

  useEffect(() => {
    setIsNfcSupported(typeof (window as unknown as { NDEFReader?: unknown }).NDEFReader === 'function')
  }, [])

  const scanNfc = async () => {
    const Reader = (window as unknown as { NDEFReader?: new () => NdefReader }).NDEFReader
    if (!Reader) {
      setNfcError('อุปกรณ์นี้ยังอ่าน NFC ผ่านเว็บไม่ได้ กรุณาใช้ Chrome บน Android หรือกรอกรหัสจาก tag เอง')
      return
    }
    setNfcError('')
    setIsScanningNfc(true)
    try {
      const reader = new Reader()
      reader.onreading = ({ message }) => {
        const code = message.records.map(readNdefText).find(Boolean)
        if (!code) {
          setNfcError('ไม่พบข้อความรหัสทรัพย์สิน')
        } else {
          setValue('assetCode', code, { shouldDirty: true, shouldValidate: true })
        }
        setIsScanningNfc(false)
      }
      await reader.scan()
    } catch {
      setIsScanningNfc(false)
      setNfcError('ไม่สามารถเริ่มอ่าน NFC ได้ กรุณาอนุญาต NFC แล้วลองใหม่')
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    try {
      const payload = {
        ...data,
        ownerOfficeId: isAdmin ? data.ownerOfficeId : user?.officeId ?? data.ownerOfficeId,
      }
      const res = await registerCover.mutateAsync(payload)
      if (res.data) {
        setCreatedCover(res.data)
        reset({
          assetCode: '',
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
          <p className="text-sm text-gray-500">ผูก NFC tag เข้ากับสำนักงานและคลัง</p>
        </div>
      </div>

      {createdCover && (
        <Card className="mb-4 text-center">
          <Image
            src={svgToDataUrl(createCoverLabelSvg(createdCover))}
            alt={`QR Code ${createdCover.assetCode}`}
            width={224}
            height={224}
            unoptimized
            className="mx-auto w-56 h-auto"
          />
          <p className="mt-3 text-sm font-medium text-green-700">ผูก NFC {createdCover.assetCode} เข้าคลังเรียบร้อย</p>
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
          <div className="rounded-xl border border-pea-200 bg-pea-50 px-4 py-3 text-sm text-pea-900">
            <p className="font-semibold">แตะ NFC เพื่อเพิ่มฉนวน</p>
            <p className="mt-1 text-pea-800">NFC tag ถูกเขียนรหัสทรัพย์สินไว้แล้ว เช่น PEA0000000001 ระบบจะอ่านรหัสนี้แล้วผูกเข้ากับสำนักงาน/คลังที่เลือก</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  label="รหัสจาก NFC / รหัสทรัพย์สิน"
                  placeholder="PEA0000000001"
                  required
                  error={errors.assetCode?.message}
                  hint="กรอกรหัสจาก tag ได้ หากอุปกรณ์ไม่รองรับ NFC"
                  {...register('assetCode')}
                />
              </div>
              <Button type="button" variant="outline" className="mb-5 shrink-0" onClick={() => void scanNfc()} disabled={isScanningNfc} leftIcon={isScanningNfc ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}>
                {isScanningNfc ? 'กำลังแตะ…' : 'อ่าน NFC'}
              </Button>
            </div>
            {!isNfcSupported && <p className="text-xs text-amber-700">ปุ่มอ่าน NFC ใช้ได้บน Chrome Android; เครื่องนี้ใช้การกรอกรหัสแทนได้</p>}
            {nfcError && <p role="alert" className="text-xs text-red-600">{nfcError}</p>}
          </div>

          <Input
            label="QR Code ที่ระบบจะสร้าง"
            value={buildQrCode(ownerOfficeId, assetCode)}
            readOnly
          />

          {isAdmin ? (
            <Select
              label="สำนักงานเจ้าของ"
              placeholder={isLoadingOffices ? 'กำลังโหลดสำนักงาน…' : 'เลือกสำนักงาน'}
              required
              disabled={isLoadingOffices}
              error={errors.ownerOfficeId?.message}
              options={offices.map((office) => ({ value: office.id, label: office.name }))}
              {...register('ownerOfficeId')}
            />
          ) : (
            <>
              <Input
                label="สำนักงานเจ้าของ"
                value={user?.office?.name ?? user?.officeId ?? 'ไม่พบสำนักงานในบัญชี'}
                readOnly
              />
              <input type="hidden" {...register('ownerOfficeId')} />
              {errors.ownerOfficeId?.message && (
                <p role="alert" className="text-xs text-red-600">{errors.ownerOfficeId.message}</p>
              )}
            </>
          )}

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
