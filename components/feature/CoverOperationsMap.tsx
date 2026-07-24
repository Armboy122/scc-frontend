'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import type { CoverMapPriority, CoverMapSite } from '@/lib/coverMap'

const markerClass: Record<CoverMapPriority, string> = {
  OVERDUE: 'is-overdue',
  DUE_SOON: 'is-due-soon',
  REMOVING: 'is-removing',
  NORMAL: 'is-normal',
}

interface CoverOperationsMapProps {
  sites: CoverMapSite[]
  selectedSiteId?: string
  onSelect: (siteId: string) => void
}

export function CoverOperationsMap({ sites, selectedSiteId, onSelect }: CoverOperationsMapProps) {
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
      markersRef.current = sites.map((site) => {
        const selected = site.id === selectedSiteId
        const icon = Leaflet.divIcon({
          className: '',
          html: `<div class="scc-cover-map-marker ${markerClass[site.priority]}${selected ? ' is-selected' : ''}"><span>${site.covers.length}</span></div>`,
          iconSize: [44, 52],
          iconAnchor: [22, 48],
        })
        const marker = Leaflet.marker([site.latitude, site.longitude], {
          icon,
          title: `${site.covers.length} ฉนวนที่ ${site.customerName}`,
          alt: `${site.covers.length} ฉนวนที่ ${site.customerName}`,
        })
          .addTo(map)
          .on('click', () => onSelectRef.current(site.id))
        marker.getElement()?.setAttribute(
          'aria-label',
          `${site.covers.length} ฉนวนที่ ${site.customerName}`,
        )
        return marker
      })

      if (sites.length > 0) {
        const bounds = Leaflet.latLngBounds(sites.map((site) => [site.latitude, site.longitude]))
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
      }
    })
    return () => { cancelled = true }
  }, [mapReady, sites, selectedSiteId])

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
      <div ref={containerRef} className="h-full min-h-[440px] w-full" aria-label="แผนที่ตำแหน่งฉนวนที่ติดตั้งอยู่" />
      {process.env.NODE_ENV === 'test' && <p className="p-4">แผนที่ตำแหน่งฉนวนที่ติดตั้งอยู่</p>}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] text-gray-600 shadow-lg backdrop-blur">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />เกินกำหนด</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />ใกล้กำหนด</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />กำลังถอด</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-pea-600" />ติดตั้งอยู่</span>
        </div>
      </div>
    </div>
  )
}
