'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import type { CoverMapKind, CoverMapPriority, CoverMapSite } from '@/lib/coverMap'

const markerClass: Record<CoverMapPriority, string> = {
  OVERDUE: 'is-overdue',
  DUE_SOON: 'is-due-soon',
  REMOVING: 'is-removing',
  NORMAL: 'is-normal',
}

interface CoverOperationsMapProps {
  sites: CoverMapSite[]
  mode: CoverMapKind
  selectedSiteId?: string
  onSelect: (siteId: string) => void
}

function escapeMapText(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

function formatTooltipDate(value?: string): string {
  if (!value) return 'ไม่ระบุวัน'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(new Date(value))
}

function groupSitesByCoordinate(sites: CoverMapSite[]): CoverMapSite[][] {
  const groups = new Map<string, CoverMapSite[]>()
  for (const site of sites) {
    const key = `${site.latitude.toFixed(6)},${site.longitude.toFixed(6)}`
    groups.set(key, [...(groups.get(key) ?? []), site])
  }
  return [...groups.values()]
}

function historyTooltip(sites: CoverMapSite[]): string {
  const heading = sites.length > 1 ? `${sites.length} งาน ณ จุดเดียวกัน` : 'ประวัติงาน ณ จุดนี้'
  const jobs = sites.map((site) => {
    const jobLabel = site.requestNumber ? `ใบคำร้อง ${site.requestNumber}` : 'งานภายใน'
    return `<div class="scc-cover-map-tooltip-job"><strong>${escapeMapText(jobLabel)}</strong><span>${escapeMapText(site.customerName)}</span><small>${escapeMapText(formatTooltipDate(site.installedAt))} – ${escapeMapText(formatTooltipDate(site.removedAt))} · ${site.covers.length} ชิ้น</small></div>`
  }).join('')
  return `<div class="scc-cover-map-tooltip"><div class="scc-cover-map-tooltip-title">${heading}</div>${jobs}</div>`
}

function activeTooltip(site: CoverMapSite): string {
  const jobLabel = site.requestNumber ? `ใบคำร้อง ${site.requestNumber}` : 'งานติดตั้ง'
  return `<div class="scc-cover-map-tooltip"><div class="scc-cover-map-tooltip-title">${escapeMapText(jobLabel)}</div><div class="scc-cover-map-tooltip-job"><strong>${escapeMapText(site.customerName)}</strong><small>${site.covers.length} ชิ้น · กำหนดถอด ${escapeMapText(formatTooltipDate(site.removalDate))}</small></div></div>`
}

export function CoverOperationsMap({ sites, mode, selectedSiteId, onSelect }: CoverOperationsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [mapReady, setMapReady] = useState(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    void import('leaflet').then((Leaflet) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const map = Leaflet.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([7.2, 100.6], 9)
      Leaflet.control.zoom({ position: 'topright' }).addTo(map)
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void import('leaflet').then((Leaflet) => {
      const map = mapRef.current
      if (cancelled || !map) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = groupSitesByCoordinate(sites).map((coordinateSites) => {
        const site = coordinateSites.find((candidate) => candidate.id === selectedSiteId) ?? coordinateSites[0]
        const selected = coordinateSites.some((candidate) => candidate.id === selectedSiteId)
        const isHistory = mode === 'HISTORY'
        const markerLabel = isHistory && coordinateSites.length > 1
          ? coordinateSites.length
          : site.covers.length
        const icon = Leaflet.divIcon({
          className: '',
          html: `<div class="scc-cover-map-marker ${isHistory ? 'is-history' : markerClass[site.priority]}${selected ? ' is-selected' : ''}"><span>${markerLabel}</span></div>`,
          iconSize: [44, 52],
          iconAnchor: [22, 48],
        })
        const markerTitle = isHistory
          ? `${coordinateSites.length} งานย้อนหลัง ณ จุดนี้`
          : `${site.covers.length} ฉนวนที่ ${site.customerName}`
        const marker = Leaflet.marker([site.latitude, site.longitude], {
          icon,
          title: markerTitle,
          alt: markerTitle,
          riseOnHover: true,
        })
          .addTo(map)
          .on('click', () => onSelectRef.current(site.id))
          .bindTooltip(isHistory ? historyTooltip(coordinateSites) : activeTooltip(site), {
            className: 'scc-cover-history-tooltip',
            direction: 'top',
            offset: [0, -38],
            opacity: 1,
          })
        marker.getElement()?.setAttribute(
          'aria-label',
          markerTitle,
        )
        return marker
      })

      if (sites.length > 0) {
        const bounds = Leaflet.latLngBounds(sites.map((site) => [site.latitude, site.longitude]))
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
      }
    })
    return () => { cancelled = true }
  }, [mapReady, mode, sites, selectedSiteId])

  useEffect(() => {
    const selected = sites.find((site) => site.id === selectedSiteId)
    if (selected && mapRef.current) {
      mapRef.current.flyTo([selected.latitude, selected.longitude], Math.max(mapRef.current.getZoom(), 14), {
        duration: 0.6,
      })
    }
  }, [selectedSiteId, sites])

  return (
    <div className="relative h-full min-h-[440px] w-full overflow-hidden bg-slate-100">
      <div ref={containerRef} className="h-full min-h-[440px] w-full" aria-label={mode === 'HISTORY' ? 'แผนที่ประวัติการติดตั้งฉนวน' : 'แผนที่ตำแหน่งฉนวนที่ติดตั้งอยู่'} />
      {process.env.NODE_ENV === 'test' && <p className="p-4">{mode === 'HISTORY' ? 'แผนที่ประวัติการติดตั้งฉนวน' : 'แผนที่ตำแหน่งฉนวนที่ติดตั้งอยู่'}</p>}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] text-gray-600 shadow-lg backdrop-blur">
        {mode === 'HISTORY' ? (
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-600" />ประวัติงานที่ถอดแล้ว · ชี้เพื่อดูรายละเอียด</span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />เกินกำหนด</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />ใกล้กำหนด</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />กำลังถอด</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-pea-600" />ติดตั้งอยู่</span>
          </div>
        )}
      </div>
    </div>
  )
}
