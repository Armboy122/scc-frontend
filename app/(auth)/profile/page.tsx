'use client'

import { useState } from 'react'
import { LogOut, Shield, User as UserIcon, Building2, AtSign, KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) return setMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    if (newPassword !== confirmPassword) return setMessage('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน')
    setSaving(true); setMessage('')
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      await logout()
    } catch (error) {
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
        <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
        <span className={['badge mt-2', ROLE_BADGE_CLASS[user.role]].join(' ')}>
          <Shield className="w-3 h-3" aria-hidden />
          {ROLE_LABEL[user.role]}
        </span>
      </Card>

      <Card className="mb-4">
        <CardHeader title="เปลี่ยนรหัสผ่าน" />
        <form className="space-y-3" onSubmit={changePassword}>
          <input className="input" type="password" required autoComplete="current-password" placeholder="รหัสผ่านปัจจุบัน" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {message && <p className="text-sm text-red-700">{message}</p>}
          <Button type="submit" loading={saving} fullWidth leftIcon={<KeyRound className="w-4 h-4" />}>เปลี่ยนรหัสผ่าน</Button>
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
          <p className="text-xs text-gray-400 mt-2">v0.1.0</p>
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
