'use client'

import { useState } from 'react'
import { Lock, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { useCreateAdminUser, useAdminUsers, useResetAdminPassword, useUpdateAdminUser } from '@/hooks/useAdmin'
import { useOffices } from '@/hooks/useOffices'
import type { AdminUser, CreateUserRequest, Role } from '@/lib/types'

const roleLabels: Record<Role, string> = { admin: 'ผู้ดูแลระบบ', exec: 'ผู้บริหาร', tech: 'ช่าง' }
const initialForm: CreateUserRequest & { confirmPassword: string } = { name: '', username: '', password: '', confirmPassword: '', role: 'tech' }

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.code === 'CONFLICT' ? 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' : error.message
  return 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง'
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL')
  const [officeFilter, setOfficeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>('ALL')
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [resetting, setResetting] = useState<AdminUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<Role>('tech')
  const [editOfficeId, setEditOfficeId] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const { data: response, isLoading, isError, refetch } = useAdminUsers(page, 20, {
    q: query.trim() || undefined,
    role: roleFilter === 'ALL' ? undefined : roleFilter,
    officeId: officeFilter || undefined,
    isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'true',
  }, user?.role === 'admin')
  const { data: offices = [] } = useOffices(user?.role === 'admin')
  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser()
  const resetUserPassword = useResetAdminPassword()

  if (user?.role !== 'admin') return <Forbidden />
  const users = response?.data ?? []
  const meta = response?.meta
  const needsOffice = form.role !== 'admin'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (form.password !== form.confirmPassword) return setFeedback({ tone: 'error', message: 'ยืนยันรหัสผ่านไม่ตรงกัน' })
    if (needsOffice && !form.officeId) return setFeedback({ tone: 'error', message: 'กรุณาเลือกสำนักงานสำหรับบทบาทนี้' })
    try {
      await createUser.mutateAsync({ name: form.name, username: form.username, password: form.password, role: form.role, officeId: needsOffice ? form.officeId : undefined })
      setForm(initialForm); setShowForm(false); setFeedback({ tone: 'success', message: 'สร้างผู้ใช้งานเรียบร้อยแล้ว' })
    } catch (error) { setFeedback({ tone: 'error', message: errorMessage(error) }) }
  }

  async function toggleActive(target: AdminUser) {
    try {
      await updateUser.mutateAsync({ id: target.id, isActive: !target.isActive })
      setFeedback({ tone: 'success', message: target.isActive ? 'ปิดบัญชีผู้ใช้งานแล้ว' : 'เปิดใช้งานบัญชีแล้ว' })
    } catch (error) { setFeedback({ tone: 'error', message: errorMessage(error) }) }
  }

  function beginEdit(target: AdminUser) {
    setEditing(target); setEditName(target.name); setEditRole(target.role); setEditOfficeId(target.officeId ?? '')
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return
    if (!editName.trim()) return setFeedback({ tone: 'error', message: 'กรุณาระบุชื่อผู้ใช้งาน' })
    if (editRole !== 'admin' && !editOfficeId) return setFeedback({ tone: 'error', message: 'กรุณาเลือกสำนักงานสำหรับผู้บริหารหรือช่าง' })
    try {
      await updateUser.mutateAsync({ id: editing.id, name: editName.trim(), role: editRole, officeId: editRole === 'admin' ? null : editOfficeId })
      setEditing(null); setFeedback({ tone: 'success', message: 'บันทึกข้อมูลผู้ใช้งานแล้ว' })
    } catch (error) { setFeedback({ tone: 'error', message: errorMessage(error) }) }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault()
    if (!resetting) return
    if (resetPassword.length < 8) return setFeedback({ tone: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
    if (resetPassword !== resetConfirm) return setFeedback({ tone: 'error', message: 'ยืนยันรหัสผ่านไม่ตรงกัน' })
    try { await resetUserPassword.mutateAsync({ id: resetting.id, password: resetPassword }); setResetting(null); setResetPassword(''); setResetConfirm(''); setFeedback({ tone: 'success', message: 'รีเซ็ตรหัสผ่านและออกจากทุก session ของผู้ใช้งานแล้ว' }) }
    catch (error) { setFeedback({ tone: 'error', message: errorMessage(error) }) }
  }

  return <div className="page-padding mx-auto w-full max-w-none">
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div><h1 className="text-xl font-bold">ผู้ใช้งาน</h1><p className="mt-1 text-sm text-gray-600">กำหนดบทบาท สำนักงาน และสถานะการเข้าถึงระบบ</p></div>
      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm((v) => !v)}>เพิ่มผู้ใช้งาน</Button>
    </header>
    {showForm && <Card className="mb-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Input label="ชื่อ-นามสกุล" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="ชื่อผู้ใช้" required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      <Select label="บทบาท" options={[{ value: 'admin', label: 'ผู้ดูแลระบบ' }, { value: 'exec', label: 'ผู้บริหาร' }, { value: 'tech', label: 'ช่าง' }]} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role, officeId: e.target.value === 'admin' ? undefined : form.officeId })} />
      <Select label="สำนักงาน" required={needsOffice} disabled={!needsOffice} placeholder={needsOffice ? 'เลือกสำนักงาน' : 'ไม่ต้องกำหนด'} options={offices.map((office) => ({ value: office.id, label: office.name }))} value={form.officeId ?? ''} onChange={(e) => setForm({ ...form, officeId: e.target.value || undefined })} />
      <Input label="รหัสผ่าน" required type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Input label="ยืนยันรหัสผ่าน" required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
      <div className="flex items-end gap-2"><Button type="submit" loading={createUser.isPending}>บันทึกผู้ใช้</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button></div>
    </form></Card>}
    {editing && <Card className="mb-5 border-pea-200"><form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Input label="ชื่อ-นามสกุล" required value={editName} onChange={(event) => setEditName(event.target.value)} /><Select label="บทบาท" options={[{ value: 'admin', label: 'ผู้ดูแลระบบ' }, { value: 'exec', label: 'ผู้บริหาร' }, { value: 'tech', label: 'ช่าง' }]} value={editRole} onChange={(event) => setEditRole(event.target.value as Role)} /><Select label="สำนักงาน" required={editRole !== 'admin'} disabled={editRole === 'admin'} placeholder={editRole === 'admin' ? 'ไม่ต้องกำหนด' : 'เลือกสำนักงาน'} options={offices.map((office) => ({ value: office.id, label: office.name }))} value={editOfficeId} onChange={(event) => setEditOfficeId(event.target.value)} /><div className="flex items-end gap-2"><Button type="submit" loading={updateUser.isPending}>บันทึกการแก้ไข</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>ยกเลิก</Button></div></form></Card>}
    <Card className="mb-5"><div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_220px_160px]"><Input aria-label="ค้นหาผู้ใช้งาน" placeholder="ค้นหาชื่อหรือชื่อผู้ใช้" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} leftAddon={<Search className="h-4 w-4" />} /><Select aria-label="กรองบทบาท" options={[{ value: 'ALL', label: 'ทุกบทบาท' }, { value: 'admin', label: 'ผู้ดูแลระบบ' }, { value: 'exec', label: 'ผู้บริหาร' }, { value: 'tech', label: 'ช่าง' }]} value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as 'ALL' | Role); setPage(1) }} /><Select aria-label="กรองสำนักงาน" placeholder="ทุกสำนักงาน" options={offices.map((office) => ({ value: office.id, label: office.name }))} value={officeFilter} onChange={(event) => { setOfficeFilter(event.target.value); setPage(1) }} /><Select aria-label="กรองสถานะ" options={[{ value: 'ALL', label: 'ทุกสถานะ' }, { value: 'true', label: 'ใช้งาน' }, { value: 'false', label: 'ปิดใช้งาน' }]} value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as 'ALL' | 'true' | 'false'); setPage(1) }} /></div></Card>
    <Card className="overflow-x-auto p-0">
      {isLoading ? <p className="p-6 text-sm text-gray-600">กำลังโหลดผู้ใช้งาน…</p> : isError ? <div className="p-6"><p className="text-sm text-red-700">โหลดข้อมูลไม่สำเร็จ</p><Button className="mt-3" variant="outline" onClick={() => void refetch()}>ลองใหม่</Button></div> : users.length === 0 ? <p className="p-8 text-center text-sm text-gray-600">ยังไม่มีผู้ใช้งาน</p> : <table className="min-w-[820px] w-full text-sm"><thead className="bg-gray-50 text-left text-gray-700"><tr><th className="px-4 py-3 font-semibold">ชื่อ</th><th className="px-4 py-3 font-semibold">ชื่อผู้ใช้</th><th className="px-4 py-3 font-semibold">บทบาท</th><th className="px-4 py-3 font-semibold">สำนักงาน</th><th className="px-4 py-3 font-semibold">สถานะ</th><th className="px-4 py-3 text-right font-semibold">การจัดการ</th></tr></thead><tbody>{users.map((item) => <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3 font-mono text-xs">{item.username}</td><td className="px-4 py-3">{roleLabels[item.role]}</td><td className="px-4 py-3 text-gray-600">{offices.find((o) => o.id === item.officeId)?.name ?? '—'}</td><td className="px-4 py-3"><span className={item.isActive ? 'badge bg-green-50 text-green-800 border-green-200' : 'badge bg-gray-100 text-gray-700 border-gray-200'}>{item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => beginEdit(item)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>แก้ไข</Button><Button size="sm" variant="outline" onClick={() => { setResetting(item); setResetPassword(''); setResetConfirm('') }}>รีเซ็ตรหัสผ่าน</Button><Button size="sm" variant={item.isActive ? 'danger' : 'outline'} loading={updateUser.isPending} onClick={() => item.isActive ? setPendingDeactivate(item) : void toggleActive(item)}>{item.isActive ? 'ปิดบัญชี' : 'เปิดบัญชี'}</Button></div></td></tr>)}</tbody></table>}
    </Card>
    {meta && <div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-600"><span className="tabular-nums">{(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} จาก {meta.total}</span><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</Button><Button size="sm" variant="outline" disabled={page * meta.limit >= meta.total} onClick={() => setPage(page + 1)}>ถัดไป</Button></div>}
    <FeedbackDialog open={Boolean(feedback)} tone={feedback?.tone ?? 'success'} title={feedback?.tone === 'error' ? 'ดำเนินการไม่สำเร็จ' : 'สำเร็จ'} message={feedback?.message ?? ''} onClose={() => setFeedback(null)} />
    {pendingDeactivate && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="deactivate-title"><Card className="w-full max-w-sm"><h2 id="deactivate-title" className="text-lg font-bold">ยืนยันการปิดบัญชี</h2><p className="mt-2 text-sm text-gray-600">ผู้ใช้ {pendingDeactivate.name} จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setPendingDeactivate(null)}>ยกเลิก</Button><Button variant="danger" loading={updateUser.isPending} onClick={() => { void toggleActive(pendingDeactivate).finally(() => setPendingDeactivate(null)) }}>ปิดบัญชี</Button></div></Card></div>}
    {resetting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title"><Card className="w-full max-w-sm"><form onSubmit={submitReset}><h2 id="reset-title" className="text-lg font-bold">รีเซ็ตรหัสผ่าน</h2><p className="mt-2 text-sm text-gray-600">ผู้ใช้ {resetting.name} จะถูกออกจากทุก session</p><div className="mt-4 space-y-3"><Input label="รหัสผ่านใหม่" type="password" autoComplete="new-password" required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /><Input label="ยืนยันรหัสผ่านใหม่" type="password" autoComplete="new-password" required value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} /></div><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setResetting(null); setResetPassword(''); setResetConfirm('') }}>ยกเลิก</Button><Button type="submit" loading={resetUserPassword.isPending}>รีเซ็ตรหัสผ่าน</Button></div></form></Card></div>}
  </div>
}

function Forbidden() { return <div className="page-padding mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p></div> }
