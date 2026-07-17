'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, LoaderCircle, Pencil, Radio, Search, ShieldCheck, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ApiError, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useUpdateCoverNfc } from '@/hooks/useCovers'
import { useOffices } from '@/hooks/useOffices'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { readNdefText, type NdefRecord, type NdefWriter } from '@/lib/nfc'
import type { Cover } from '@/lib/types'

type NdefReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>
  onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null
}

type NdefReaderConstructor = new () => NdefReader
type NdefWriterConstructor = new () => NdefWriter

export default function CheckTagPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { data: offices = [] } = useOffices()
  const updateNfc = useUpdateCoverNfc()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Cover | null>(null)
  const [replacementCode, setReplacementCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isNfcSupported, setIsNfcSupported] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const readerRef = useRef<NdefReader | null>(null)
  const scanAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setIsNfcSupported(typeof (window as unknown as { NDEFReader?: unknown }).NDEFReader === 'function')
  }, [])
  useEffect(() => () => { releaseReader() }, [])

  const releaseReader = () => {
    if (readerRef.current) readerRef.current.onreading = null
    readerRef.current = null
    scanAbortRef.current?.abort()
    scanAbortRef.current = null
  }

  const officeName = (id: string) => offices.find((office) => office.id === id)?.name ?? 'ไม่ระบุสำนักงาน'

  const lookup = async (value = code) => {
    const normalized = value.trim()
    if (!normalized) { setError('กรุณาแตะหรือกรอกรหัสจาก tag'); return }
    setError(''); setNotice(''); setResult(null)
    try {
      const response = await api.get<Cover>('/covers/lookup', { code: normalized })
      if (!response.data) throw new Error('ไม่พบข้อมูล tag นี้')
      setResult(response.data)
      setReplacementCode(response.data.nfcId ?? normalized)
    } catch (lookupError) {
      setError(lookupError instanceof ApiError && lookupError.status === 404 ? 'ไม่พบ tag นี้ในทะเบียน' : 'ไม่สามารถตรวจสอบ tag ได้ กรุณาลองใหม่')
    }
  }

  const scan = async () => {
    const Reader = (window as unknown as { NDEFReader?: NdefReaderConstructor }).NDEFReader
    if (!Reader) { setError('อุปกรณ์นี้ยังอ่าน NFC ผ่านเว็บไม่ได้ กรุณาใช้ Chrome บน Android หรือกรอกรหัสเอง'); return }
    setError(''); setNotice(''); setIsScanning(true)
    const controller = new AbortController()
    try {
      const reader = new Reader()
      readerRef.current = reader
      scanAbortRef.current = controller
      reader.onreading = ({ message }) => {
        if (readerRef.current !== reader || controller.signal.aborted) return
        const found = message.records.map(readNdefText).find(Boolean)
        releaseReader()
        setIsScanning(false)
        if (!found) { setError('ไม่พบข้อความรหัสใน NFC tag'); return }
        setCode(found)
        void lookup(found)
      }
      await reader.scan({ signal: controller.signal })
    } catch {
      if (controller.signal.aborted) return
      if (scanAbortRef.current === controller) releaseReader()
      else controller.abort()
      setIsScanning(false); setError('ไม่สามารถเริ่มอ่าน NFC ได้ กรุณาอนุญาต NFC แล้วลองใหม่')
    }
  }

  const ensureReplacementAvailable = async (value: string) => {
    if (value === result?.nfcId) return
    try {
      const existing = await api.get<Cover>('/covers/lookup', { code: value })
      if (existing.data && existing.data.id !== result?.id) throw new Error('รหัสใหม่นี้ถูกใช้กับ tag อื่นแล้ว')
    } catch (lookupError) {
      if (lookupError instanceof ApiError && lookupError.status === 404) return
      throw lookupError
    }
  }

  const rewrite = async () => {
    const nextCode = replacementCode.trim()
    if (!result || !nextCode) { setError('กรุณากรอกรหัสใหม่ที่จะเขียนลง tag'); return }
    const Writer = (window as unknown as { NDEFReader?: NdefWriterConstructor }).NDEFReader
    if (!Writer) { setError('อุปกรณ์นี้ยังเขียน NFC ผ่านเว็บไม่ได้ กรุณาใช้ Chrome บน Android'); return }
    setError(''); setNotice(''); setIsWriting(true)
    let tagWritten = false
    try {
      await ensureReplacementAvailable(nextCode)
      await new Writer().write(nextCode)
      tagWritten = true
      const response = await updateNfc.mutateAsync({ id: result.id, nfcId: nextCode })
      const updated = response.data
      if (!updated) throw new Error('บันทึกข้อมูลทะเบียนไม่สำเร็จ')
      setResult(updated); setCode(nextCode); setReplacementCode(nextCode)
      setNotice('เขียน tag และอัปเดตทะเบียนเรียบร้อย')
    } catch (writeError) {
      setError(tagWritten
        ? 'เขียน NFC แล้ว แต่บันทึกทะเบียนไม่สำเร็จ: กรุณาเก็บรหัสใหม่นี้ไว้และติดต่อผู้ดูแลระบบ'
        : writeError instanceof Error ? writeError.message : 'ไม่สามารถแก้ไข tag ได้ กรุณาลองใหม่')
    } finally { setIsWriting(false) }
  }

  if (!isAdmin) return <div className="page-padding mx-auto max-w-xl"><Card><h1 className="text-xl font-bold text-gray-900">ไม่มีสิทธิ์ตรวจสอบ NFC tag</h1><p className="mt-2 text-sm text-gray-600">หน้านี้ใช้สำหรับผู้ดูแลระบบตรวจสอบทะเบียน Cover เท่านั้น</p></Card></div>

  return <div className="page-padding mx-auto max-w-xl">
    <div className="mb-6 flex items-center gap-3">
      <button onClick={() => router.back()} className="-ml-2 rounded-xl p-2 transition-colors hover:bg-gray-100" aria-label="ย้อนกลับ"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
      <div><h1 className="text-xl font-bold text-gray-900">ตรวจสอบ NFC tag</h1><p className="text-sm text-gray-500">ดูรหัสและสำนักงานเจ้าของจาก tag ที่แตะ</p></div>
    </div>

    <Card className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-pea-200 bg-pea-50 p-4 text-sm text-pea-900"><Tag className="mt-0.5 h-5 w-5 shrink-0" /><p><span className="font-semibold">แตะ tag เพื่อตรวจสอบ</span><br />หรือกรอกรหัสจาก NFC / QR / รหัสทรัพย์สินได้</p></div>
      <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Input label="รหัสจาก tag" value={code} onChange={(event) => setCode(event.target.value)} placeholder="เช่น COVER-0001" autoComplete="off" /></div><Button type="button" variant="outline" className="mb-0 shrink-0" onClick={() => void lookup()} leftIcon={<Search className="h-4 w-4" />}>ตรวจสอบ</Button></div>
      <Button type="button" variant="secondary" fullWidth onClick={() => void scan()} loading={isScanning} leftIcon={isScanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}>{isScanning ? 'กำลังรอแตะ tag…' : 'อ่าน NFC tag'}</Button>
      {!isNfcSupported && <p className="text-xs text-amber-700">การอ่านและแก้ไขผ่าน NFC ใช้ได้บน Chrome Android ผ่าน HTTPS</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Card>

    {result && <div className="mt-4 space-y-4">
      <Card className="border-green-200 bg-green-50"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" /><div className="min-w-0"><p className="font-semibold text-green-900">พบ tag ในทะเบียน</p><dl className="mt-3 space-y-2 text-sm text-green-900"><div><dt className="text-green-700">รหัสทรัพย์สิน</dt><dd className="break-all font-mono font-semibold">{result.assetCode}</dd></div><div><dt className="text-green-700">รหัสใน NFC tag</dt><dd className="break-all font-mono">{result.nfcId ?? 'ไม่มี'}</dd></div><div><dt className="text-green-700">สำนักงานเจ้าของ</dt><dd>{officeName(result.ownerOfficeId)}</dd></div><div><dt className="text-green-700">สำนักงานที่ครอบครองอยู่</dt><dd>{officeName(result.currentOfficeId)}</dd></div></dl><div className="mt-3"><StatusBadge coverStatus={result.status} size="sm" /></div></div></div></Card>
      {isAdmin && <Card><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-pea-700" /><div><h2 className="font-semibold">แก้ไข NFC tag</h2><p className="text-xs text-gray-600">สำหรับผู้ดูแลระบบเท่านั้น: ระบบจะเขียน tag ก่อน แล้วจึงอัปเดตทะเบียน</p></div></div><div className="mt-4 space-y-3"><Input label="ข้อความใหม่ที่จะเขียนลง NFC" value={replacementCode} onChange={(event) => setReplacementCode(event.target.value)} maxLength={100} hint="รหัสต้องไม่ซ้ำกับ tag อื่นในทะเบียน" /><Button type="button" fullWidth loading={isWriting} disabled={!isNfcSupported} leftIcon={<Pencil className="h-4 w-4" />} onClick={() => void rewrite()}>{isWriting ? 'กำลังเขียนและบันทึก…' : 'เขียนทับและบันทึกการแก้ไข'}</Button>{notice && <p className="text-sm text-green-700">{notice}</p>}</div></Card>}
    </div>}
  </div>
}
