'use client'

import { use } from 'react'
import { ArrowLeft, Calendar, MapPin, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCoverDetail } from '@/hooks/useCovers'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card } from '@/components/ui/Card'
import { getCoverContextLabels } from '@/lib/coverPresentation'

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }) : 'ยังไม่กำหนด'

export default function CoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useCoverDetail(id)
  if (isLoading) return <div className="page-padding">กำลังโหลดฉนวน…</div>
  if (error || !data) return <div className="page-padding" role="alert">ไม่สามารถเข้าถึงรายละเอียดฉนวนได้</div>
  const { cover, ownerOffice, currentOffice, activeBorrow, activeWorkOrder, activeInstallation, lifecycleHistory, derivedAlerts } = data
  const labels = getCoverContextLabels({ status: cover.status, ownerOfficeId: cover.ownerOfficeId, currentOfficeId: cover.currentOfficeId, activeBorrow, activeWorkOrder })
  return <div className="page-padding max-w-3xl mx-auto space-y-4">
    <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-pea-700"><ArrowLeft className="w-4 h-4" /> กลับ</button>
    <div><h1 className="font-mono text-xl font-bold">{cover.assetCode}</h1><div className="mt-2 flex flex-wrap gap-2"><StatusBadge coverStatus={cover.status} size="sm" />{labels.slice(1).map(label => <span key={label} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{label}</span>)}</div></div>
    {derivedAlerts.length > 0 && <Card className="border-orange-200 bg-orange-50"><p className="text-sm font-medium text-orange-800">{derivedAlerts.join(' · ')}</p></Card>}
    <Card><h2 className="font-semibold">ความรับผิดชอบ</h2><dl className="mt-2 space-y-2 text-sm"><div><dt className="text-gray-500">สำนักงานเจ้าของ</dt><dd>{ownerOffice.name}</dd></div><div><dt className="text-gray-500">ผู้ครอบครองปัจจุบัน</dt><dd>{currentOffice.name}</dd></div></dl></Card>
    {activeBorrow && <Card><h2 className="flex items-center gap-2 font-semibold"><Package className="w-4 h-4"/> การยืม</h2><p className="mt-2 text-sm">สถานะ {activeBorrow.status} · กำหนดคืน {formatDate(activeBorrow.returnDate)}</p></Card>}
    {activeWorkOrder && <Card><h2 className="flex items-center gap-2 font-semibold"><Calendar className="w-4 h-4"/> ใบงาน {activeWorkOrder.id}</h2><p className="mt-2 text-sm">กำหนดถอด {formatDate(activeWorkOrder.removalDate)}</p>{(activeInstallation?.gpsLat ?? activeWorkOrder.gpsLat) != null && <p className="mt-2 flex items-center gap-1 text-sm"><MapPin className="w-4 h-4"/> {activeInstallation?.gpsLat ?? activeWorkOrder.gpsLat}, {activeInstallation?.gpsLng ?? activeWorkOrder.gpsLng}</p>}</Card>}
    <Card><h2 className="font-semibold">ประวัติการเปลี่ยนแปลง</h2>{lifecycleHistory.length === 0 ? <p className="mt-2 text-sm text-gray-500">ยังไม่มีประวัติการยืม–คืน</p> : <ol className="mt-3 space-y-3">{lifecycleHistory.map((event, index) => <li key={`${event.action}-${event.createdAt}-${index}`} className="border-l-2 border-pea-200 pl-3 text-sm"><p className="font-medium">{event.action}</p><p className="text-gray-500">{formatDate(event.createdAt)} · {event.actorName ?? event.actorId ?? 'ระบบ'}</p>{event.reason && <p className="mt-1 text-gray-600">{event.reason}</p>}</li>)}</ol>}</Card>
  </div>
}
