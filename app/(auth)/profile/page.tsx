'use client'

import { useState } from 'react'
import { AlertCircle, AtSign, Building2, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, LogOut, Pencil, Shield, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Role } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  exec:  'ผู้บริหาร',
  tech:  'ช่าง',
}

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-pea-100 text-pea-800 border-pea-200',
  exec:  'bg-amber-100 text-amber-800 border-amber-200',
  tech:  'bg-sky-100 text-sky-800 border-sky-200',
}

interface InfoRowProps {
  icon: React.ElementType
  label: string
  value: string
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error')
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')

  if (!user) return null

  async function saveName(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setMessageTone('error'); setMessage('กรุณากรอกชื่อ-นามสกุล'); return }
    setSaving(true); setMessage('')
    try {
      const response = await api.patch<typeof user>('/auth/profile', { name: name.trim() })
      if (!response.data) throw new Error('บันทึกชื่อไม่สำเร็จ')
      updateUser({ ...user, ...response.data })
      setEditingName(false); setMessageTone('success'); setMessage('บันทึกชื่อ-นามสกุลแล้ว')
    } catch (error) { setMessageTone('error'); setMessage(error instanceof Error ? error.message : 'บันทึกชื่อไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) { setMessageTone('error'); return setMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร') }
    if (newPassword !== confirmPassword) { setMessageTone('error'); return setMessage('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน') }
    setSaving(true); setMessage(''); setMessageTone('error')
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      setMessageTone('success')
      setMessage('บันทึกรหัสผ่านใหม่แล้ว กำลังออกจากระบบเพื่อให้คุณเข้าสู่ระบบอีกครั้ง')
      await logout()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally { setSaving(false) }
  }

  return (
    <div className="page-padding max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-5">โปรไฟล์</h1>

      {/* Avatar card */}
      <Card className="mb-4 text-center" padding="lg">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold"
          style={{ background: 'var(--color-primary)' }}
          aria-hidden
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        {editingName ? <form onSubmit={saveName} className="mx-auto mt-1 flex max-w-xs gap-2"><Input aria-label="ชื่อ-นามสกุล" value={name} onChange={(event) => setName(event.target.value)} autoFocus /><Button type="submit" loading={saving}>บันทึก</Button></form> : <div className="flex items-center justify-center gap-1"><h2 className="text-xl font-bold text-gray-900">{user.name}</h2><button type="button" onClick={() => { setName(user.name); setEditingName(true) }} className="rounded-lg p-1.5 text-pea-700 hover:bg-pea-50" aria-label="แก้ไขชื่อ"><Pencil className="h-4 w-4" /></button></div>}
        <span className={['badge mt-2', ROLE_BADGE_CLASS[user.role]].join(' ')}>
          <Shield className="w-3 h-3" aria-hidden />
          {ROLE_LABEL[user.role]}
        </span>
      </Card>

      <Card className="mb-4 overflow-hidden border border-pea-100" padding="lg">
        <div className="-mx-6 -mt-6 mb-5 border-b border-pea-100 bg-gradient-to-br from-pea-50 via-white to-amber-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pea-700 text-white shadow-sm"><LockKeyhole className="h-5 w-5" /></span>
            <div><h2 className="text-base font-bold text-gray-900">ความปลอดภัยบัญชี</h2><p className="mt-1 text-sm leading-5 text-gray-600">ตั้งรหัสผ่านใหม่เพื่อปกป้องบัญชีของคุณ</p></div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={changePassword}>
          <Input label="รหัสผ่านปัจจุบัน" type={showPasswords ? 'text' : 'password'} required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input label="รหัสผ่านใหม่" type={showPasswords ? 'text' : 'password'} required minLength={8} autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input label="ยืนยันรหัสผ่านใหม่" type={showPasswords ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="flex items-center gap-2 text-sm font-medium text-pea-700 hover:text-pea-900">
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPasswords ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          </button>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">หลังบันทึก ระบบจะออกจากทุกอุปกรณ์ และให้เข้าสู่ระบบด้วยรหัสใหม่</div>
          {message && <div role="alert" className={['flex gap-2 rounded-xl px-3 py-2.5 text-sm', messageTone === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'].join(' ')}>{messageTone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}{message}</div>}
          <Button type="submit" size="lg" loading={saving} fullWidth leftIcon={<KeyRound className="w-4 h-4" />}>บันทึกรหัสผ่านใหม่</Button>
        </form>
      </Card>

      {/* Info card */}
      <Card className="mb-4">
        <CardHeader title="ข้อมูลบัญชี" />
        <dl>
          <InfoRow icon={UserIcon} label="ชื่อ-นามสกุล" value={user.name} />
          <InfoRow icon={AtSign} label="ชื่อผู้ใช้" value={user.username} />
          {user.office && (
            <InfoRow icon={Building2} label="สำนักงาน" value={user.office.name} />
          )}
        </dl>
      </Card>

      {/* App info */}
      <Card className="mb-6">
        <CardHeader title="ข้อมูลแอพ" />
        <div className="space-y-1 text-sm text-gray-500">
          <p>Smart Cover Connect</p>
          <p>การไฟฟ้าส่วนภูมิภาค</p>
          <p className="text-xs text-gray-500 mt-2">v0.1.0</p>
        </div>
      </Card>

      <Button
        variant="danger"
        size="lg"
        fullWidth
        leftIcon={<LogOut className="w-5 h-5" />}
        onClick={() => void logout()}
      >
        ออกจากระบบ
      </Button>
    </div>
  )
}
