'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Database, LoaderCircle, PenLine, Radio, ShieldCheck, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ApiError, api } from '@/lib/api'
import { useRegisterCover } from '@/hooks/useCovers'
import { useOffices } from '@/hooks/useOffices'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { NdefWriter } from '@/lib/nfc'
import type { Cover } from '@/lib/types'

type NdefReaderConstructor = new () => NdefWriter

export default function WriteNfcPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  // All signed-in roles may read offices. Exec/tech need this list to show
  // their assigned office name because the auth payload only carries officeId.
  const { data: offices = [], isLoading: isLoadingOffices } = useOffices(Boolean(user))
  const registerCover = useRegisterCover()
  const [value, setValue] = useState('')
  const [officeId, setOfficeId] = useState(user?.officeId ?? '')
  const [isNfcSupported, setIsNfcSupported] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'checking' | 'writing' | 'registering'>('idle')
  const [error, setError] = useState('')
  const [createdCover, setCreatedCover] = useState<Cover | null>(null)

  useEffect(() => {
    if (!isAdmin && user?.officeId) setOfficeId(user.officeId)
  }, [isAdmin, user?.officeId])

  useEffect(() => {
    setIsNfcSupported(typeof (window as unknown as { NDEFReader?: unknown }).NDEFReader === 'function')
  }, [])

  const isWorking = phase !== 'idle'

  const ensureUnused = async (code: string) => {
    try {
      await api.get('/covers/lookup', { code })
      throw new Error('ข้อมูลนี้มีอยู่ในทะเบียนแล้ว กรุณาใช้ข้อความอื่น')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) return
      throw requestError
    }
  }

  const writeTag = async () => {
    const code = value.trim()
    if (!code) {
      setError('กรุณากรอกข้อความที่จะเขียนลง NFC')
      return
    }
    if (!officeId) {
      setError('กรุณาเลือกสำนักงานเจ้าของ')
      return
    }

    const Reader = (window as unknown as { NDEFReader?: NdefReaderConstructor }).NDEFReader
    if (!Reader) {
      setError('อุปกรณ์นี้ยังเขียน NFC ผ่านเว็บไม่ได้ กรุณาใช้ Chrome บน Android')
      return
    }

    setError('')
    setCreatedCover(null)
    let tagWritten = false
    try {
      setPhase('checking')
      await ensureUnused(code)

      setPhase('writing')
      // Passing a string creates a standard NDEF Text record. No tag-specific
      // format is imposed; the exact text entered here becomes its identifier.
      await new Reader().write(code)
      tagWritten = true

      setPhase('registering')
      const response = await registerCover.mutateAsync({
        assetCode: code,
        nfcId: code,
        ownerOfficeId: officeId,
      })
      if (!response.data) throw new Error('บันทึกทะเบียนไม่สำเร็จ')

      setCreatedCover(response.data)
      setValue('')
    } catch (writeError) {
      if (tagWritten) {
        setError('เขียน NFC แล้ว แต่บันทึกทะเบียนไม่สำเร็จ: กรุณาเก็บข้อความนี้ไว้และติดต่อผู้ดูแลระบบ')
      } else if (writeError instanceof Error) {
        setError(writeError.message)
      } else {
        setError('ไม่สามารถเขียน NFC ได้ กรุณาอนุญาต NFC แล้วลองใหม่')
      }
    } finally {
      setPhase('idle')
    }
  }

  const actionLabel = phase === 'checking'
    ? 'กำลังตรวจสอบ…'
    : phase === 'writing'
      ? 'แตะ NFC tag…'
      : phase === 'registering'
        ? 'กำลังบันทึกทะเบียน…'
        : 'เขียนและลงทะเบียน NFC'

  return (
    <div className="page-padding mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="-ml-2 rounded-xl p-2 transition-colors hover:bg-gray-100" aria-label="ย้อนกลับ">
          <ArrowLeft className="h-5 w-5 text-gray-600" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">เขียน NFC tag</h1>
          <p className="text-sm text-gray-500">สร้างรหัสใหม่และผูกเข้าทะเบียนทันที</p>
        </div>
      </div>

      {createdCover ? (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden />
            <div>
              <h2 className="font-semibold text-green-900">เขียนและลงทะเบียนสำเร็จ</h2>
              <p className="mt-1 break-all font-mono text-sm text-green-800">{createdCover.assetCode}</p>
              <p className="mt-2 text-sm text-green-800">tag นี้พร้อมใช้งานแล้ว</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 border-green-300 bg-white" onClick={() => router.push(`/covers/${createdCover.id}`)}>ดูรายการ</Button>
            <Button type="button" className="flex-1" onClick={() => setCreatedCover(null)}>เขียนอีก tag</Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="relative overflow-hidden bg-pea-700 px-5 pb-5 pt-6 text-white">
            <div className="absolute -right-9 -top-10 h-32 w-32 rounded-full border-[18px] border-white/10" aria-hidden />
            <div className="relative flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                <Tag className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-white/75">NFC Writer</p>
                <h2 className="text-lg font-bold tracking-tight">สร้าง tag พร้อมทะเบียน</h2>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ol className="mb-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-gray-600">
              <li className="rounded-xl bg-pea-50 px-2 py-2 text-pea-800"><span className="mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full bg-pea-600 text-[10px] text-white">1</span>ตรวจรหัส</li>
              <li className={phase === 'writing' ? 'rounded-xl bg-pea-100 px-2 py-2 text-pea-900' : 'rounded-xl bg-gray-50 px-2 py-2'}><span className="mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full bg-gray-300 text-[10px] text-white">2</span>แตะ tag</li>
              <li className={phase === 'registering' ? 'rounded-xl bg-pea-100 px-2 py-2 text-pea-900' : 'rounded-xl bg-gray-50 px-2 py-2'}><span className="mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full bg-gray-300 text-[10px] text-white">3</span>บันทึก</li>
            </ol>
            <div className="rounded-xl border border-pea-200 bg-pea-50 px-4 py-3 text-sm text-pea-900">
            <div className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">ข้อความอะไรก็ได้ แต่ใช้ซ้ำไม่ได้</p>
                <p className="mt-1 text-pea-800">ระบบตรวจทะเบียนก่อนเขียน แล้วเก็บข้อความเดียวกันเป็นรหัสของฉนวน เพื่อใช้สแกนในงานต่อไป</p>
              </div>
            </div>
            </div>

            <div className="mt-5 space-y-4">
            <Input
              label="ข้อความที่จะเขียนลง NFC"
              placeholder="เช่น COVER-0001 หรือ รหัสที่ตกลงกัน"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={isWorking}
              autoComplete="off"
              maxLength={100}
              hint="ไม่กำหนดรูปแบบ; ระบบจะปฏิเสธข้อความที่มีอยู่แล้วในทะเบียน"
            />

            {isAdmin ? (
              <Select
                label="สำนักงานเจ้าของ"
                required
                placeholder={isLoadingOffices ? 'กำลังโหลดสำนักงาน…' : 'เลือกสำนักงาน'}
                options={offices.map((office) => ({ value: office.id, label: office.name }))}
                value={officeId}
                onChange={(event) => setOfficeId(event.target.value)}
                disabled={isLoadingOffices || isWorking}
              />
            ) : (
              <Input label="สำนักงานเจ้าของ" value={user?.office?.name ?? offices.find((office) => office.id === user?.officeId)?.name ?? 'ไม่พบชื่อสำนักงาน'} readOnly />
            )}

            {!isNfcSupported && <p className="text-xs text-amber-700">การเขียน NFC ใช้ได้บน Chrome Android ผ่าน HTTPS</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <Button type="button" size="lg" fullWidth loading={isWorking} disabled={!isNfcSupported} leftIcon={isWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} onClick={() => void writeTag()}>
              {actionLabel}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500"><Radio className="h-3.5 w-3.5" aria-hidden />กดปุ่มแล้วจึงนำ tag มาแตะโทรศัพท์</p>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400"><Database className="h-3.5 w-3.5" aria-hidden />ห้ามใช้ข้อความซ้ำกับทะเบียนเดิม</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
