'use client'

import { BriefcaseBusiness, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUsageModes } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function UsageModesPage() {
  const { user } = useAuth(); const { data = [], isLoading, isError, refetch } = useUsageModes(user?.role === 'admin')
  if (user?.role !== 'admin') return <div className="page-padding mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p></div>
  return <div className="page-padding mx-auto w-full max-w-none"><header className="mb-6"><h1 className="text-xl font-bold">โหมดการใช้งาน</h1><p className="mt-1 text-sm text-gray-600">ค่าการทำงานที่กำหนดโดยระบบ</p></header>{isLoading ? <Card><p className="text-sm text-gray-600">กำลังโหลดโหมดการใช้งาน…</p></Card> : isError ? <Card><p className="text-sm text-red-700">โหลดข้อมูลไม่สำเร็จ</p><Button className="mt-3" variant="outline" onClick={() => void refetch()}>ลองใหม่</Button></Card> : data.length === 0 ? <Card><p className="text-sm text-gray-600">ระบบยังไม่ได้ส่งคืนโหมดการใช้งาน</p></Card> : <div className="grid gap-4 md:grid-cols-2">{data.map((mode) => <Card key={mode.code}><BriefcaseBusiness className="mb-4 h-7 w-7 text-pea-600" /><h2 className="font-semibold">{mode.name ?? mode.code}</h2><p className="mt-1 text-sm text-gray-600">{mode.description ?? 'กำหนดโดยระบบ ไม่สามารถแก้ไขจากหน้านี้ได้'}</p><p className="mt-4 font-mono text-xs text-gray-600">{mode.code}</p><span className="badge mt-4 border-pea-200 bg-pea-50 text-pea-800">กำหนดโดยระบบ</span></Card>)}</div>}</div>
}
