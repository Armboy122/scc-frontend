'use client'

import { useState } from 'react'
import { Building2, Lock, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'
import { useAuth } from '@/lib/auth'
import { useCreateOffice, useUpdateOffice, useWorkHubs } from '@/hooks/useAdmin'
import type { Office } from '@/lib/types'
import { useOffices } from '@/hooks/useOffices'

export default function OfficesPage() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [workHubId, setWorkHubId] = useState('')
  const [editing, setEditing] = useState<Office | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const { data: offices = [], isLoading, isError, refetch } = useOffices(user?.role === 'admin')
  const { data: hubs = [] } = useWorkHubs(user?.role === 'admin')
  const createOffice = useCreateOffice()
  const updateOffice = useUpdateOffice()
  if (user?.role !== 'admin') return <div className="page-padding mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p></div>
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !workHubId) return
    try { await createOffice.mutateAsync({ name: name.trim(), workHubId }); setName(''); setWorkHubId(''); setShowForm(false); setFeedback({ tone: 'success', message: 'เพิ่มสำนักงานเรียบร้อยแล้ว' }) }
    catch { setFeedback({ tone: 'error', message: 'ไม่สามารถเพิ่มสำนักงานได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่' }) }
  }
  async function saveEdit(event: React.FormEvent) { event.preventDefault(); if (!editing || !name.trim() || !workHubId) return; try { await updateOffice.mutateAsync({ id: editing.id, name: name.trim(), workHubId }); setEditing(null); setName(''); setWorkHubId(''); setFeedback({ tone: 'success', message: 'บันทึกสำนักงานแล้ว' }) } catch { setFeedback({ tone: 'error', message: 'ไม่สามารถบันทึกสำนักงานได้' }) } }
  function beginEdit(office: Office) { setEditing(office); setName(office.name); setWorkHubId(office.workHubId); setShowForm(false) }
  return <div className="page-padding mx-auto w-full max-w-none"><header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h1 className="text-xl font-bold">สำนักงาน</h1><p className="mt-1 text-sm text-gray-600">จัดการรายการสำนักงานและสังกัด WorkHub</p></div><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm((value) => !value)}>เพิ่มสำนักงาน</Button></header>
    {(showForm || editing) && <Card className="mb-5"><form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={editing ? saveEdit : submit}><Input label="ชื่อสำนักงาน" required value={name} onChange={(e) => setName(e.target.value)} className="sm:flex-1" /><Select label="WorkHub" required placeholder="เลือก WorkHub" options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))} value={workHubId} onChange={(e) => setWorkHubId(e.target.value)} className="sm:flex-1" /><div className="flex gap-2"><Button type="submit" loading={createOffice.isPending || updateOffice.isPending}>{editing ? 'บันทึกการแก้ไข' : 'บันทึก'}</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setName(''); setWorkHubId('') }}>ยกเลิก</Button></div></form></Card>}
    <Card className="overflow-x-auto p-0">{isLoading ? <p className="p-6 text-sm text-gray-600">กำลังโหลดสำนักงาน…</p> : isError ? <div className="p-6"><p className="text-sm text-red-700">โหลดข้อมูลไม่สำเร็จ</p><Button className="mt-3" variant="outline" onClick={() => void refetch()}>ลองใหม่</Button></div> : offices.length === 0 ? <div className="p-10 text-center text-sm text-gray-600">ยังไม่มีสำนักงาน <button className="text-pea-700 underline" onClick={() => setShowForm(true)}>เพิ่มสำนักงานแรก</button></div> : <table className="min-w-[640px] w-full text-sm"><thead className="bg-gray-50 text-left text-gray-700"><tr><th className="px-4 py-3 font-semibold">สำนักงาน</th><th className="px-4 py-3 font-semibold">WorkHub</th><th className="px-4 py-3 font-semibold">รหัส</th><th className="px-4 py-3 text-right font-semibold">การจัดการ</th></tr></thead><tbody>{offices.map((office) => <tr key={office.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-medium"><Building2 className="mr-2 inline h-4 w-4 text-pea-600" />{office.name}</td><td className="px-4 py-3 text-gray-600">{hubs.find((hub) => hub.id === office.workHubId)?.name ?? office.workHubId}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{office.id}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => beginEdit(office)}>แก้ไข</Button></td></tr>)}</tbody></table>}</Card>
    <p className="mt-3 text-sm text-gray-600">ระบบปัจจุบันรองรับการเพิ่มและดูสำนักงานเท่านั้น</p><FeedbackDialog open={Boolean(feedback)} tone={feedback?.tone ?? 'success'} title={feedback?.tone === 'error' ? 'ดำเนินการไม่สำเร็จ' : 'สำเร็จ'} message={feedback?.message ?? ''} onClose={() => setFeedback(null)} /></div>
}
