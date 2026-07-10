'use client'

import { useState } from 'react'
import { Lock, Radio, RotateCw, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRfidScan } from '@/hooks/useAdmin'
import { useOffices } from '@/hooks/useOffices'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { RFIDScanResult } from '@/lib/types'

export default function RfidPage() {
  const { user } = useAuth(); const { data: offices = [] } = useOffices(user?.role === 'admin'); const scan = useRfidScan()
  const [officeId, setOfficeId] = useState(''); const [tagsText, setTagsText] = useState(''); const [result, setResult] = useState<RFIDScanResult | null>(null); const [error, setError] = useState('')
  if (user?.role !== 'admin') return <div className="page-padding mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p></div>
  async function submit(event: React.FormEvent) { event.preventDefault(); const tags = [...new Set(tagsText.split(/[\n,\t]+/).map((tag) => tag.trim()).filter(Boolean))]; if (!officeId || tags.length === 0) { setError('กรุณาเลือกสำนักงานและกรอกรหัสอย่างน้อย 1 รายการ'); return }; setError(''); try { setResult(await scan.mutateAsync({ officeId, tags }) ?? null) } catch { setError('ไม่สามารถส่งรายการตรวจนับได้ กรุณาลองใหม่') } }
  function reset() { setTagsText(''); setResult(null); setError('') }
  return <div className="page-padding mx-auto w-full max-w-none"><header className="mb-6"><h1 className="text-xl font-bold">ตรวจนับ RFID</h1><p className="mt-1 text-sm text-gray-600">วางหรือยิงรหัสจาก reader ที่ทำงานเสมือนแป้นพิมพ์ได้ครั้งละหลายบรรทัด ระบบยังไม่มี direct hardware integration</p></header><div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.2fr)]"><Card><form onSubmit={submit} className="space-y-4"><Select label="สำนักงาน" required placeholder="เลือกสำนักงาน" options={offices.map((office) => ({ value: office.id, label: office.name }))} value={officeId} onChange={(event) => setOfficeId(event.target.value)} /><Textarea label="RFID / NFC / QR / Asset tag" required rows={10} value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder={'หนึ่งรหัสต่อหนึ่งบรรทัด\nหรือวางข้อมูลจาก reader ได้'} /><p className="text-xs text-gray-600">ระบบจะตัดรหัสซ้ำก่อนส่งข้อมูล</p>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex gap-2"><Button type="submit" loading={scan.isPending} leftIcon={<Send className="h-4 w-4" />}>ประมวลผลการตรวจนับ</Button><Button type="button" variant="outline" onClick={reset} leftIcon={<RotateCw className="h-4 w-4" />}>เริ่มใหม่</Button></div></form></Card><Result result={result} /></div></div>
}
function Result({ result }: { result: RFIDScanResult | null }) { if (!result) return <Card className="flex min-h-64 flex-col items-center justify-center text-center"><Radio className="mb-3 h-9 w-9 text-pea-600" /><p className="font-medium">รอผลตรวจนับ</p><p className="mt-1 text-sm text-gray-600">ผลจะปรากฏเมื่อส่งรายการจาก scanner</p></Card>; return <Card><h2 className="font-semibold">ผลตรวจนับล่าสุด</h2><p className="mt-1 text-xs text-gray-600">{new Date(result.createdAt).toLocaleString('th-TH')}</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['ระบบ', result.expected], ['สแกน', result.scanned], ['ตรงกัน', result.matched], ['ไม่ทราบ', result.unknown.length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-gray-200 p-3 text-center"><p className="text-xs text-gray-600">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>)}</div><ScanList title="ไม่พบในคลัง" values={result.missing} tone="red" /><ScanList title="รหัสที่ไม่รู้จัก" values={result.unknown} tone="orange" /></Card> }
function ScanList({ title, values, tone }: { title: string; values: string[]; tone: 'red' | 'orange' }) { return <section className="mt-5"><h3 className={`text-sm font-semibold ${tone === 'red' ? 'text-red-800' : 'text-orange-800'}`}>{title} <span className="tabular-nums">({values.length})</span></h3>{values.length === 0 ? <p className="mt-2 text-sm text-gray-600">ไม่มีรายการ</p> : <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-200">{values.map((value) => <p key={value} className="border-b border-gray-100 px-3 py-2 font-mono text-xs last:border-0">{value}</p>)}</div>}</section> }
