'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, Download, PenLine, Tag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useBatchRegisterCovers } from '@/hooks/useCovers'
import { useOffices } from '@/hooks/useOffices'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ApiError, api } from '@/lib/api'
import type { NdefWriter } from '@/lib/nfc'
import { createCoverLabelSvg, downloadSvg, svgToDataUrl } from '@/lib/qr'
import type { Cover, RegisterCoverRequest } from '@/lib/types'

interface RowData { id: string; assetCode: string; nfcId: string }
interface RowError { assetCode?: string; nfcId?: string }
type NdefWriterConstructor = new () => NdefWriter

const createRows = (assetCodes: string[]): RowData[] => assetCodes.map((assetCode) => ({ id: crypto.randomUUID(), assetCode, nfcId: '' }))
const buildQrCode = (officeId: string, assetCode: string) => officeId.trim() && assetCode.trim() ? `SCC:${officeId.trim()}:${assetCode.trim()}` : '-'

function OwnerOfficeSelector({ officeId, submitted, onChange }: { officeId: string; submitted: boolean; onChange: (value: string) => void }) {
  const { data: offices = [], isLoading } = useOffices()
  return (
    <Select
      label="สำนักงานเจ้าของ"
      required
      placeholder={isLoading ? 'กำลังโหลดสำนักงาน…' : 'เลือกสำนักงาน'}
      disabled={isLoading}
      options={offices.map((office) => ({ value: office.id, label: office.name }))}
      value={officeId}
      onChange={(event) => onChange(event.target.value)}
      error={submitted && !officeId.trim() ? 'กรุณาเลือกสำนักงาน' : undefined}
    />
  )
}

export default function BatchRegisterPage() {
  const { user } = useAuth()
  const router = useRouter()
  const batchRegister = useBatchRegisterCovers()
  const isAdmin = user?.role === 'admin'
  const { data: offices = [] } = useOffices(isAdmin)
  const [officeId, setOfficeId] = useState(user?.officeId ?? '')
  const [assetCodesText, setAssetCodesText] = useState('')
  const [rows, setRows] = useState<RowData[]>([])
  const rowsRef = useRef<RowData[]>([])
  const [rowErrors, setRowErrors] = useState<Record<string, RowError>>({})
  const [submitted, setSubmitted] = useState(false)
  const [createdCovers, setCreatedCovers] = useState<Cover[]>([])
  const [isNfcSupported, setIsNfcSupported] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  const setRowsAndRef = (next: RowData[] | ((previous: RowData[]) => RowData[])) => {
    setRows((previous) => {
      const value = typeof next === 'function' ? next(previous) : next
      rowsRef.current = value
      return value
    })
  }

  useEffect(() => { if (user?.role !== 'admin' && user?.officeId) setOfficeId(user.officeId) }, [user])
  useEffect(() => { setIsNfcSupported(typeof (window as unknown as { NDEFReader?: unknown }).NDEFReader === 'function') }, [])

  const prepareRows = () => {
    const assetCodes = assetCodesText.split(/[\n,\t]+/).map((code) => code.trim()).filter(Boolean)
    if (!assetCodes.length) { setScanMessage('กรุณาใส่รหัสทรัพย์สินอย่างน้อย 1 รายการ'); return }
    const duplicate = assetCodes.find((code, index) => assetCodes.indexOf(code) !== index)
    if (duplicate) { setScanMessage(`รหัสทรัพย์สินซ้ำ: ${duplicate}`); return }
    setRowsAndRef(createRows(assetCodes)); setRowErrors({}); setScanMessage('เตรียมรายการแล้ว กดเขียน NFC แล้วแตะแท็กว่างตามลำดับ')
  }

  const ensureUnused = async (code: string) => {
    try {
      await api.get('/covers/lookup', { code })
      throw new Error(`รหัส ${code} มีอยู่ในทะเบียนแล้ว กรุณาใช้รหัสอื่น`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return
      throw error
    }
  }

  const writeNextTag = async () => {
    const Writer = (window as unknown as { NDEFReader?: NdefWriterConstructor }).NDEFReader
    const current = rowsRef.current
    const targetIndex = current.findIndex((row) => !row.nfcId)
    if (!Writer) { setScanMessage('อุปกรณ์นี้ยังเขียน NFC ผ่านเว็บไม่ได้ กรุณาใช้ Chrome บน Android ผ่าน HTTPS'); return }
    if (targetIndex < 0) { setScanMessage('เขียน NFC ครบทุกรายการแล้ว พร้อมลงทะเบียน'); return }

    const target = current[targetIndex]
    setIsWriting(true)
    setScanMessage(`นำ NFC tag ว่างมาแตะเพื่อเขียนรหัส ${target.assetCode}`)
    try {
      await ensureUnused(target.assetCode)
      await new Writer().write(target.assetCode)
      setRowsAndRef((previous) => previous.map((row) => row.id === target.id ? { ...row, nfcId: target.assetCode } : row))
      setRowErrors((previous) => { const next = { ...previous }; if (next[target.id]) delete next[target.id].nfcId; return next })
      const remaining = current.length - targetIndex - 1
      setScanMessage(remaining === 0 ? 'เขียน NFC ครบทุกรายการแล้ว พร้อมลงทะเบียน' : `เขียน ${target.assetCode} แล้ว — เหลือ ${remaining} tag`)
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'ไม่สามารถเขียน NFC ได้ กรุณาอนุญาต NFC แล้วลองใหม่')
    } finally {
      setIsWriting(false)
    }
  }

  const validate = () => {
    const errors: Record<string, RowError> = {}; const assets = new Set<string>(); const nfcTags = new Set<string>(); let valid = Boolean(rows.length)
    rows.forEach((row) => {
      const error: RowError = {}; const asset = row.assetCode.trim(); const nfc = row.nfcId.trim()
      if (!asset) error.assetCode = 'จำเป็น'; else if (assets.has(asset)) error.assetCode = 'ซ้ำ'; else assets.add(asset)
      if (!nfc) error.nfcId = 'ยังไม่ได้แตะ'; else if (nfcTags.has(nfc)) error.nfcId = 'ซ้ำ'; else nfcTags.add(nfc)
      if (Object.keys(error).length) { errors[row.id] = error; valid = false }
    })
    setRowErrors(errors); return valid
  }

  const handleSubmit = async () => {
    setSubmitted(true); if (!officeId.trim() || !validate()) return
    const items: RegisterCoverRequest[] = rows.map((row) => ({ assetCode: row.assetCode.trim(), nfcId: row.nfcId.trim(), ownerOfficeId: officeId.trim() }))
    try {
      const response = await batchRegister.mutateAsync({ ownerOfficeId: officeId.trim(), items })
      if (response.data) { setCreatedCovers(response.data); setRowsAndRef([]); setAssetCodesText(''); setScanMessage('') }
    } catch { /* Mutation error is rendered below. */ }
  }

  const paired = rows.filter((row) => row.nfcId).length
  return <div className="page-padding mx-auto max-w-4xl">
    <div className="mb-6 flex items-center gap-3"><button onClick={() => router.back()} className="-ml-2 rounded-xl p-2 transition-colors hover:bg-gray-100" aria-label="ย้อนกลับ"><ArrowLeft className="h-5 w-5 text-gray-600" /></button><div><h1 className="text-xl font-bold text-gray-900">ลงทะเบียนหลายรายการด้วย NFC</h1><p className="text-sm text-gray-500">เตรียมรหัสทรัพย์สิน แล้วเขียนลง NFC tag ว่างทีละใบตามลำดับ</p></div></div>

    <Card className="mb-5">{isAdmin ? <OwnerOfficeSelector officeId={officeId} submitted={submitted} onChange={setOfficeId} /> : <Input label="สำนักงานเจ้าของ" value={user?.office?.name ?? 'ไม่พบสำนักงานในบัญชี'} readOnly />}</Card>

    {createdCovers.length > 0 && <Card className="mb-5"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">ลงทะเบียนเรียบร้อย</h2><p className="text-sm text-gray-500">{createdCovers.length} รายการ</p></div><Button type="button" variant="outline" onClick={() => setCreatedCovers([])}>ลงชุดใหม่</Button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{createdCovers.map((cover) => { const ownerOfficeName = isAdmin ? offices.find((office) => office.id === cover.ownerOfficeId)?.name : user?.office?.name; return <div key={cover.id} className="rounded-lg border border-gray-200 p-2 text-center"><Image src={svgToDataUrl(createCoverLabelSvg(cover, ownerOfficeName))} alt={`QR Code ${cover.assetCode}`} width={240} height={240} unoptimized className="h-auto w-full" /><button type="button" onClick={() => downloadSvg(`cover-${cover.assetCode}.svg`, createCoverLabelSvg(cover, ownerOfficeName))} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-pea-700 hover:text-pea-800"><Download className="h-3.5 w-3.5" />โหลด QR</button></div>})}</div></Card>}

    <Card className="mb-4"><div className="flex items-start gap-3"><Tag className="mt-0.5 h-5 w-5 shrink-0 text-pea-700" /><div><h2 className="font-semibold text-gray-900">1. เตรียมรหัสทรัพย์สิน</h2><p className="mt-1 text-sm text-gray-600">วางรหัสทีละบรรทัดหรือคั่นด้วย comma ระบบจะสร้างลำดับให้ก่อนเริ่มเขียน NFC</p></div></div><div className="mt-4"><Textarea label="รหัสทรัพย์สิน" rows={7} value={assetCodesText} onChange={(event) => setAssetCodesText(event.target.value)} placeholder={'PEA-0001\nPEA-0002\nPEA-0003'} /></div><div className="mt-3"><Button type="button" onClick={prepareRows}>เตรียมรายการ</Button></div>{scanMessage && rows.length === 0 && <p role="status" className="mt-3 text-sm text-red-700">{scanMessage}</p>}</Card>

    {rows.length > 0 && <><Card className="mb-4 overflow-hidden p-0"><div className="flex flex-col gap-3 border-b border-pea-200 bg-pea-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-pea-900">2. เขียน NFC tag ว่างตามลำดับ</p><p className="mt-1 text-sm text-pea-800">เขียนแล้ว <span className="font-semibold tabular-nums">{paired}/{rows.length}</span> รายการ</p></div><Button type="button" leftIcon={<PenLine className="h-4 w-4" />} loading={isWriting} disabled={!isNfcSupported || paired === rows.length} onClick={() => void writeNextTag()}>{isWriting ? 'กำลังเขียน — แตะ tag ว่าง…' : 'เขียน NFC tag ถัดไป'}</Button></div>{!isNfcSupported && <p className="px-4 pt-3 text-xs text-amber-700">การเขียน NFC ใช้ได้บน Chrome Android ผ่าน HTTPS</p>}{scanMessage && <p role="status" className="px-4 pt-3 text-sm text-pea-800">{scanMessage}</p>}<div className="overflow-x-auto p-4"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left"><th className="w-10 pb-2 text-gray-500">#</th><th className="pb-2 text-gray-700">รหัสทรัพย์สิน</th><th className="pb-2 text-gray-700">ข้อมูลใน NFC</th><th className="pb-2 text-gray-700">QR</th></tr></thead><tbody>{rows.map((row, index) => { const errors = rowErrors[row.id] ?? {}; return <tr key={row.id} className="border-b border-gray-100 last:border-0"><td className="py-3 text-gray-400">{index + 1}</td><td className="py-3 font-mono font-medium">{row.assetCode}{errors.assetCode && <p className="mt-1 text-xs text-red-600">{errors.assetCode}</p>}</td><td className="py-3"><p aria-label={`NFC tag ${index + 1}`} className={errors.nfcId ? 'text-red-600' : row.nfcId ? 'font-mono text-green-700' : 'text-gray-400'}>{row.nfcId || 'รอเขียนลง tag ว่าง'}</p>{errors.nfcId && <p className="mt-1 text-xs text-red-600">{errors.nfcId}</p>}</td><td className="py-3 font-mono text-xs text-gray-500">{buildQrCode(officeId, row.assetCode)}</td></tr> })}</tbody></table></div></Card>
      {batchRegister.error instanceof ApiError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{batchRegister.error.message}</div>}
      <div className="flex gap-3"><Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1">ยกเลิก</Button><Button size="lg" className="flex-1" loading={batchRegister.isPending} onClick={() => void handleSubmit()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>ลงทะเบียน {rows.length} รายการ</Button></div>
    </>}
  </div>
}
