'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Check,
  ChevronRight,
  History,
  MapPin,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { CoverOperationsMap } from '@/components/feature/CoverOperationsMap'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAllCovers } from '@/hooks/useCovers'
import { useAllWorkOrders } from '@/hooks/useWorkOrders'
import {
  buildCoverMapHistorySites,
  buildCoverMapSites,
  countCompletedWorkOrdersWithoutMapCoordinates,
  createGoogleMapsDirectionsUrl,
  type CoverMapKind,
  type CoverMapPriority,
  type CoverMapSite,
} from '@/lib/coverMap'

type PriorityFilter = 'ALL' | 'ACTION' | CoverMapPriority

const FILTERS: Array<{ value: PriorityFilter; label: string }> = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'ACTION', label: 'ควรจัดการ' },
  { value: 'OVERDUE', label: 'เกินกำหนด' },
  { value: 'DUE_SOON', label: 'ใกล้กำหนด' },
  { value: 'REMOVING', label: 'กำลังถอด' },
]

const priorityLabel: Record<CoverMapPriority, string> = {
  OVERDUE: 'เกินกำหนดถอด',
  DUE_SOON: 'ใกล้กำหนดถอด',
  REMOVING: 'กำลังถอด',
  NORMAL: 'ติดตั้งอยู่',
}

const priorityStyle: Record<CoverMapPriority, string> = {
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  DUE_SOON: 'border-amber-200 bg-amber-50 text-amber-800',
  REMOVING: 'border-violet-200 bg-violet-50 text-violet-700',
  NORMAL: 'border-pea-200 bg-pea-50 text-pea-700',
}

function formatDate(value?: string) {
  if (!value) return 'ไม่ระบุวัน'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(new Date(value))
}

function SiteCard({
  site,
  selected,
  inRoute,
  onSelect,
  onToggleRoute,
}: {
  site: CoverMapSite
  selected: boolean
  inRoute: boolean
  onSelect: () => void
  onToggleRoute: () => void
}) {
  const isHistory = site.kind === 'HISTORY'
  return (
    <article className={[
      'rounded-2xl border bg-white p-3 shadow-sm transition',
      selected ? 'border-pea-400 ring-2 ring-pea-100' : 'border-gray-200 hover:border-gray-300',
    ].join(' ')}>
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start gap-3">
          <span className={[
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isHistory
              ? 'bg-slate-100 text-slate-600'
              : site.priority === 'OVERDUE'
                ? 'bg-red-100 text-red-700'
                : 'bg-pea-100 text-pea-700',
          ].join(' ')}>
            {isHistory
              ? <History className="h-5 w-5" />
              : site.priority === 'OVERDUE'
                ? <TriangleAlert className="h-5 w-5" />
                : <MapPin className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-sm font-bold text-gray-900">{site.customerName}</h2>
              <span className={[
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                isHistory ? 'border-slate-200 bg-slate-50 text-slate-600' : priorityStyle[site.priority],
              ].join(' ')}>
                {isHistory ? 'ประวัติ' : priorityLabel[site.priority]}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {site.requestNumber ? `เลขที่ ${site.requestNumber} · ` : ''}{site.officeName}
            </p>
          </div>
        </div>
        <div className={[
          'mt-3 grid gap-2 rounded-xl bg-gray-50 p-2.5',
          isHistory ? 'grid-cols-3' : 'grid-cols-2',
        ].join(' ')}>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">ฉนวนที่จุดนี้</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{site.covers.length} ชิ้น</p>
          </div>
          {isHistory ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">ติดตั้ง</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-800">{formatDate(site.installedAt)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">ถอด</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-800">{formatDate(site.removedAt)}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">กำหนดถอด</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{formatDate(site.removalDate)}</p>
            </div>
          )}
        </div>
        {selected && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[11px] font-semibold text-gray-500">รหัสฉนวน</p>
            <div className="flex flex-wrap gap-1.5">
              {site.covers.map((cover) => (
                <span key={cover.id} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">
                  {cover.assetCode}
                </span>
              ))}
            </div>
          </div>
        )}
      </button>
      <div className="mt-3 flex items-center gap-2">
        {!isHistory && (
          <button
            type="button"
            onClick={onToggleRoute}
            className={[
              'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition',
              inRoute ? 'border-pea-600 bg-pea-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            {inRoute ? <Check className="h-4 w-4" /> : <Route className="h-4 w-4" />}
            {inRoute ? 'อยู่ในแผนแล้ว' : 'เพิ่มในแผน'}
          </button>
        )}
        <Link
          href={`/workorders/${encodeURIComponent(site.workOrderId)}`}
          className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          เปิดใบงาน <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

export default function InstalledCoverMapPage() {
  const [mapMode, setMapMode] = useState<CoverMapKind>('ACTIVE')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [selectedSiteId, setSelectedSiteId] = useState<string>()
  const [routeSiteIds, setRouteSiteIds] = useState<string[]>([])
  const { data: workOrders = [], isLoading: workOrdersLoading, error: workOrdersError } = useAllWorkOrders()
  const { data: covers = [], isLoading: coversLoading, error: coversError } = useAllCovers()

  const activeSites = useMemo(() => buildCoverMapSites(workOrders, covers), [covers, workOrders])
  const historySites = useMemo(() => buildCoverMapHistorySites(workOrders, covers), [covers, workOrders])
  const sites = mapMode === 'ACTIVE' ? activeSites : historySites
  const historyWorkOrderCount = new Set(historySites.map((site) => site.workOrderId)).size
  const historyMissingCoordinates = countCompletedWorkOrdersWithoutMapCoordinates(workOrders)

  const filteredSites = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th')
    return sites.filter((site) => {
      const priorityMatches = mapMode === 'HISTORY'
        || priorityFilter === 'ALL'
        || (priorityFilter === 'ACTION' && site.priority !== 'NORMAL')
        || site.priority === priorityFilter
      if (!priorityMatches) return false
      if (!query) return true
      return [
        site.customerName,
        site.requestNumber,
        site.officeName,
        ...site.covers.map((cover) => cover.assetCode),
      ].some((value) => value?.toLocaleLowerCase('th').includes(query))
    })
  }, [mapMode, priorityFilter, search, sites])

  const selectedRouteSites = routeSiteIds
    .map((id) => activeSites.find((site) => site.id === id))
    .filter((site): site is CoverMapSite => Boolean(site))
  const routeUrl = createGoogleMapsDirectionsUrl(selectedRouteSites)
  const urgentCount = activeSites.filter((site) => site.priority !== 'NORMAL').length
  const isLoading = workOrdersLoading || coversLoading
  const hasError = Boolean(workOrdersError || coversError)

  function changeMode(mode: CoverMapKind) {
    setMapMode(mode)
    setSelectedSiteId(undefined)
    setRouteSiteIds([])
    setPriorityFilter('ALL')
  }

  function toggleRoute(siteId: string) {
    setRouteSiteIds((current) =>
      current.includes(siteId) ? current.filter((id) => id !== siteId) : [...current, siteId],
    )
  }

  const headerTitle = mapMode === 'ACTIVE' ? 'แผนที่ฉนวนที่ติดตั้งอยู่' : 'ประวัติการติดตั้งบนแผนที่'
  const headerDescription = mapMode === 'ACTIVE'
    ? 'เห็นทุกจุด วางแผนเก็บหลายงานในเที่ยวเดียว'
    : 'ย้อนดูว่าแต่ละจุดเคยเป็นงานใด ใช้ฉนวนเลขอะไร และถอดเมื่อไร'

  return (
    <div className="min-h-full bg-[#f4f2f8]">
      <header className="border-b border-pea-900/30 bg-[#240d36] px-4 py-5 text-white md:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-pea-200">
              {mapMode === 'ACTIVE' ? <ShieldCheck className="h-4 w-4" /> : <History className="h-4 w-4" />}
              {mapMode === 'ACTIVE' ? 'Field visibility' : 'Installation history'}
            </div>
            <h1 className="text-2xl font-bold text-white">{headerTitle}</h1>
            <p className="mt-1 text-sm text-white/65">{headerDescription}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-[420px]">
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5">
              <p className="text-[10px] text-white/50">{mapMode === 'ACTIVE' ? 'จุดติดตั้ง' : 'งานย้อนหลัง'}</p>
              <p className="text-xl font-bold text-white">{mapMode === 'ACTIVE' ? activeSites.length : historyWorkOrderCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5">
              <p className="text-[10px] text-white/50">{mapMode === 'ACTIVE' ? 'ฉนวนบนแผนที่' : 'ครั้งติดตั้ง'}</p>
              <p className="text-xl font-bold text-white">{sites.reduce((sum, site) => sum + site.covers.length, 0)}</p>
            </div>
            <div className={[
              'rounded-xl border px-3 py-2.5',
              mapMode === 'ACTIVE' || historyMissingCoordinates > 0
                ? 'border-amber-300/20 bg-amber-300/10'
                : 'border-white/10 bg-white/[0.07]',
            ].join(' ')}>
              <p className={['text-[10px]', mapMode === 'ACTIVE' || historyMissingCoordinates > 0 ? 'text-amber-100/70' : 'text-white/50'].join(' ')}>
                {mapMode === 'ACTIVE' ? 'ควรจัดการ' : 'งานไม่มีพิกัด'}
              </p>
              <p className={['text-xl font-bold', mapMode === 'ACTIVE' || historyMissingCoordinates > 0 ? 'text-amber-300' : 'text-white'].join(' ')}>
                {mapMode === 'ACTIVE' ? urgentCount : historyMissingCoordinates}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-3 md:p-5">
        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center">
          <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="เลือกมุมมองแผนที่">
            {([
              { value: 'ACTIVE' as const, label: 'ติดตั้งอยู่', count: activeSites.length },
              { value: 'HISTORY' as const, label: 'ประวัติ', count: historyWorkOrderCount },
            ]).map((mode) => (
              <button
                key={mode.value}
                type="button"
                aria-pressed={mapMode === mode.value}
                onClick={() => changeMode(mode.value)}
                className={[
                  'min-h-10 rounded-lg px-3 text-xs font-semibold transition',
                  mapMode === mode.value ? 'bg-white text-pea-800 shadow-sm' : 'text-gray-500 hover:text-gray-800',
                ].join(' ')}
              >
                {mode.label} <span className="tabular-nums">({mode.count})</span>
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <Input
              aria-label="ค้นหาบนแผนที่"
              placeholder="ค้นหาสถานที่ เลขที่งาน สำนักงาน หรือรหัสฉนวน"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leftAddon={<Search className="h-4 w-4" />}
            />
          </div>
          {mapMode === 'ACTIVE' && (
            <div className="flex gap-2 overflow-x-auto" role="group" aria-label="กรองความเร่งด่วน">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setPriorityFilter(filter.value)}
                  className={[
                    'shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                    priorityFilter === filter.value
                      ? 'border-pea-600 bg-pea-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-pea-300',
                  ].join(' ')}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
          {mapMode === 'ACTIVE' && selectedRouteSites.length > 0 && (
            <Button
              type="button"
              size="sm"
              leftIcon={<Navigation className="h-4 w-4" />}
              onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}
            >
              เปิดเส้นทาง {selectedRouteSites.length} จุด
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="grid min-h-[560px] animate-pulse grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 bg-white lg:grid-cols-[380px_1fr]">
            <div className="border-r border-gray-100 bg-gray-50" />
            <div className="bg-slate-100" />
          </div>
        )}

        {hasError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
            ไม่สามารถโหลดตำแหน่งฉนวนได้ กรุณาลองใหม่อีกครั้ง
          </div>
        )}

        {!isLoading && !hasError && (
          <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-[calc(100dvh-285px)] lg:grid-cols-[380px_1fr]">
            <section className="order-2 flex min-h-0 flex-col border-t border-gray-200 lg:order-1 lg:border-r lg:border-t-0" aria-label={mapMode === 'ACTIVE' ? 'รายการจุดติดตั้ง' : 'รายการประวัติการติดตั้ง'}>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{mapMode === 'ACTIVE' ? 'จุดที่พบ' : 'งานย้อนหลังที่พบ'}</p>
                  <p className="text-xs text-gray-500">{filteredSites.length} จาก {sites.length} จุด</p>
                </div>
                {mapMode === 'ACTIVE' && routeSiteIds.length > 0 && (
                  <button type="button" onClick={() => setRouteSiteIds([])} className="text-xs font-semibold text-pea-700 hover:underline">
                    ล้างแผน
                  </button>
                )}
              </div>
              <div className="space-y-2 overflow-y-auto bg-[#faf9fc] p-3 lg:flex-1">
                {filteredSites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    selected={selectedSiteId === site.id}
                    inRoute={routeSiteIds.includes(site.id)}
                    onSelect={() => setSelectedSiteId(site.id)}
                    onToggleRoute={() => toggleRoute(site.id)}
                  />
                ))}
                {filteredSites.length === 0 && (
                  <div className="py-16 text-center">
                    {mapMode === 'ACTIVE'
                      ? <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      : <History className="mx-auto mb-3 h-10 w-10 text-gray-300" />}
                    <p className="text-sm font-semibold text-gray-600">
                      {search ? 'ไม่พบจุดที่ตรงกับการค้นหา' : mapMode === 'ACTIVE' ? 'ยังไม่มีฉนวนติดตั้งอยู่' : 'ยังไม่มีประวัติที่มีพิกัด'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search ? 'ลองล้างคำค้นหรือเปลี่ยนมุมมอง' : 'งานที่ไม่มีพิกัดจะไม่แสดงบนแผนที่'}
                    </p>
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className="mt-3 text-xs font-semibold text-pea-700 hover:underline">
                        ล้างคำค้น
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
            <section className="order-1 min-h-[440px] lg:order-2" aria-label="แผนที่">
              <CoverOperationsMap
                sites={filteredSites}
                mode={mapMode}
                selectedSiteId={selectedSiteId}
                onSelect={setSelectedSiteId}
              />
            </section>
          </div>
        )}

        {!isLoading && !hasError && sites.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarClock className="h-4 w-4" />
            {mapMode === 'ACTIVE'
              ? 'แสดงเฉพาะฉนวนที่ติดตั้งแล้ว ยังไม่ถูกถอด และมีพิกัด GPS'
              : `แสดงประวัติที่ติดตั้งและถอดแล้วพร้อมพิกัด GPS${historyMissingCoordinates > 0 ? ` · มี ${historyMissingCoordinates} งานที่ไม่แสดงเพราะไม่มีพิกัด` : ''}`}
          </p>
        )}
      </main>
    </div>
  )
}
