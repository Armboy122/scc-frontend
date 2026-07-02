'use client'

import { LogOut, Shield, User as UserIcon, Building2, AtSign } from 'lucide-react'
import { useAuth } from '@/lib/auth'
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

  if (!user) return null

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
