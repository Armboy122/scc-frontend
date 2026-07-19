'use client'

import { use } from 'react'
import { ArrowLeft, Building2, CalendarDays, ExternalLink, MapPin, PackageCheck, Route, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCoverDetail } from '@/hooks/useCovers'
import { useOffices } from '@/hooks/useOffices'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card } from '@/components/ui/Card'
import { getCoverContextLabels } from '@/lib/coverPresentation'
import type { Office } from '@/lib/types'
import { formatThaiDate } from '@/lib/thaiDate'

const formatDate = (value?: string) => formatThaiDate(value, { day: 'numeric', month: 'long', year: 'numeric' })

const BORROW_ACTION_LABELS: Record<string, string> = {
  CREATE: 'สร้างคำขอยืม',
  APPROVE: 'อนุมัติการยืม',
  REJECT: 'ปฏิเสธคำขอยืม',
  CANCEL: 'ยกเลิกคำขอยืม',
  ACTIVATE: 'ส่งมอบฉนวน',
  MARK_OVERDUE: 'เกินกำหนดคืน',
  RETURN: 'รับคืนฉนวน',
}

function borrowActionLabel(action: string) {
  return BORROW_ACTION_LABELS[action] ?? action
}

function officeName(office: Office | undefined, id: string, offices: Office[]) {
  return office?.name ?? offices.find((item) => item.id === id)?.name ?? 'ไม่ระบุสำนักงาน'
}

function LocationPreview({ latitude, longitude }: { latitude: number; longitude: number }) {
  const query = `${latitude},${longitude}`
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-pea-700" aria-hidden />
          <div>
            <h2 className="font-semibold text-gray-900">ตำแหน่งติดตั้ง</h2>
            <p className="text-xs text-gray-500">ตำแหน่งโดยประมาณจากการบันทึกหน้างาน</p>
          </div>
        </div>
        <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-pea-700 hover:text-pea-800 hover:underline">
          เปิด Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <iframe title="แผนที่ตำแหน่งติดตั้ง" src={embedUrl} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <p className="px-4 py-2 text-xs text-gray-500">พิกัด {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
    </Card>
  )
}

export default function CoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error, refetch, isFetching } = useCoverDetail(id)
  const { data: offices = [] } = useOffices()

  if (isLoading) return <div className="page-padding mx-auto max-w-3xl"><div className="card-surface h-64 animate-pulse bg-gray-100" /></div>
  if (error || !data) return (
    <div className="page-padding mx-auto max-w-lg py-16 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" aria-hidden />
      <p role="alert" className="mt-3 font-medium text-red-600">ไม่สามารถโหลดรายละเอียดฉนวนได้</p>
      <p className="mt-1 text-sm text-gray-500">กรุณาลองใหม่ หรือตรวจสอบสิทธิ์สำนักงานของคุณ</p>
      <div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => void refetch()} className="rounded-xl bg-pea-600 px-4 py-2 text-sm font-medium text-white" disabled={isFetching}>ลองใหม่</button><button type="button" onClick={() => router.back()} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">กลับ</button></div>
    </div>
  )

  const { cover, ownerOffice, currentOffice, activeBorrow, activeWorkOrder, activeInstallation, lifecycleHistory, derivedAlerts } = data
  const labels = getCoverContextLabels({ status: cover.status, ownerOfficeId: cover.ownerOfficeId, currentOfficeId: cover.currentOfficeId, activeBorrow, activeWorkOrder })
  const ownerName = officeName(ownerOffice, cover.ownerOfficeId, offices)
  const custodianName = officeName(currentOffice, cover.currentOfficeId, offices)
  const latitude = activeInstallation?.gpsLat ?? activeWorkOrder?.gpsLat
  const longitude = activeInstallation?.gpsLng ?? activeWorkOrder?.gpsLng
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number'

  return (
    <div className="page-padding mx-auto max-w-3xl space-y-4">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm font-medium text-pea-700 hover:text-pea-800"><ArrowLeft className="h-4 w-4" /> กลับไปหน้าฉนวน</button>

      <header className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-lg shadow-slate-950/20">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">ทะเบียนฉนวน</p><h1 className="mt-2 break-all font-mono text-3xl font-black tracking-tight text-white sm:text-4xl">{cover.assetCode}</h1></div><StatusBadge coverStatus={cover.status} /></div>
        <div className="mt-5 flex flex-wrap gap-2">{labels.slice(1).map((label) => <span key={label} className="rounded-full border border-amber-200/40 bg-amber-100 px-3 py-1.5 text-xs font-bold text-slate-950">{label}</span>)}</div>
      </header>

      {derivedAlerts.length > 0 && <Card className="border-orange-200 bg-orange-50"><p className="text-sm font-medium text-orange-800">{derivedAlerts.join(' · ')}</p></Card>}

      <Card className="border-slate-200 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><Building2 className="h-5 w-5 text-pea-700" aria-hidden /><h2 className="font-semibold">ความรับผิดชอบของฉนวน</h2></div>
        <dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-sky-800">สำนักงานเจ้าของ</dt><dd className="mt-1 text-lg font-bold text-slate-950">{ownerName}</dd></div><div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-violet-800">สำนักงานที่ครอบครองปัจจุบัน</dt><dd className="mt-1 text-lg font-bold text-slate-950">{custodianName}</dd></div></dl>
      </Card>

      {activeWorkOrder ? <Card className="border-pea-200 bg-pea-50/40"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-pea-700 shadow-sm"><Route className="h-5 w-5" aria-hidden /></span><div className="min-w-0"><h2 className="font-semibold text-gray-900">กำลังใช้งานกับใบงาน</h2><p className="mt-1 text-sm text-gray-700">{activeWorkOrder.customerName || 'งานติดตั้งในพื้นที่'}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-gray-500">กำหนดติดตั้ง</dt><dd>{formatDate(activeWorkOrder.installDate)}</dd></div><div><dt className="text-xs text-gray-500">กำหนดถอด</dt><dd>{formatDate(activeWorkOrder.removalDate)}</dd></div></dl></div></div></Card> : <Card className="border-gray-200"><div className="flex items-center gap-3"><PackageCheck className="h-6 w-6 text-gray-400" aria-hidden /><div><h2 className="font-semibold text-gray-900">ยังไม่มีงานติดตั้งที่กำลังใช้งาน</h2><p className="mt-0.5 text-sm text-gray-500">ฉนวนชิ้นนี้ไม่มีการติดตั้งค้างอยู่ในระบบ</p></div></div></Card>}

      {hasLocation && <LocationPreview latitude={latitude} longitude={longitude} />}

      {activeBorrow && <Card><h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-pea-700" /> การยืมระหว่างสำนักงาน</h2><p className="mt-2 text-sm text-gray-700">สถานะ {activeBorrow.status} · กำหนดคืน {formatDate(activeBorrow.returnDate)}</p></Card>}

      <Card><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-pea-700" aria-hidden /><div><h2 className="font-semibold">ประวัติยืม–คืน</h2><p className="text-xs text-gray-500">ลำดับการยืม การส่งมอบ และการคืนของฉนวนชิ้นนี้</p></div></div>{lifecycleHistory.length === 0 ? <p className="mt-3 text-sm text-gray-500">ยังไม่มีประวัติการยืม–คืน</p> : <ol className="mt-4 space-y-3">{lifecycleHistory.map((event, index) => <li key={`${event.action}-${event.createdAt}-${index}`} className="border-l-2 border-pea-200 pl-3 text-sm"><p className="font-medium">{borrowActionLabel(event.action)}</p><p className="text-gray-500">{formatDate(event.createdAt)} · {event.actorName ?? 'ระบบ'}</p>{event.reason && <p className="mt-1 text-gray-600">{event.reason}</p>}</li>)}</ol>}</Card>
    </div>
  )
}
