'use client'

import Link from 'next/link'
import { Building2, FileBarChart, Lock, Radio, Settings2, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const links = [
  { href: '/admin/users', label: 'ผู้ใช้งาน', description: 'บทบาท สำนักงาน และสถานะบัญชี', icon: Users },
  { href: '/admin/offices', label: 'สำนักงาน', description: 'รายการสำนักงานและ WorkHub', icon: Building2 },
  { href: '/admin/workhubs', label: 'WorkHub', description: 'โหนดระดับภูมิภาค', icon: Settings2 },
  { href: '/admin/reports', label: 'รายงาน', description: 'สรุปและส่งออกข้อมูล', icon: FileBarChart },
  { href: '/admin/rfid', label: 'ตรวจนับ RFID', description: 'เทียบรายการจาก reader กับสต็อก', icon: Radio },
]

export default function AdminMorePage() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <div className="page-padding mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p className="font-medium">สำหรับผู้ดูแลระบบเท่านั้น</p></div>
  return <div className="page-padding mx-auto w-full max-w-none"><header className="mb-6"><h1 className="text-xl font-bold">ผู้ดูแลระบบ</h1><p className="mt-1 text-sm text-gray-600">เครื่องมือจัดการระบบเพิ่มเติม</p></header><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="card-surface flex items-center gap-3 p-4 transition-colors hover:border-pea-300 hover:bg-pea-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pea-500"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pea-50 text-pea-700"><Icon className="h-5 w-5" /></span><span><span className="block font-semibold text-gray-900">{label}</span><span className="mt-0.5 block text-sm text-gray-600">{description}</span></span></Link>)}</div></div>
}
