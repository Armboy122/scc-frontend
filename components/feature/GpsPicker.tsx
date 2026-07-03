'use client'

import { useEffect, useRef, useState } from 'react'
import type { DivIcon, LatLngExpression, LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface GpsCoords {
  latitude: number
  longitude: number
  accuracy?: number
  label?: string
}

interface GpsPickerProps {
  value?: GpsCoords | null
  onChange: (coords: GpsCoords | null) => void
}

interface LocationSearchResult {
  label: string
  latitude: number
  longitude: number
}

type LocationSource = 'gps' | 'map' | 'search' | 'drag' | 'manual'

const DEFAULT_MAP_CENTER: LatLngExpression = [13.7563, 100.5018]
const DEFAULT_MAP_ZOOM = 6
const FOCUSED_MAP_ZOOM = 16

function formatCoords(value: GpsCoords): string {
  return `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
}

function sourceLabel(source: LocationSource) {
  switch (source) {
    case 'gps':
      return 'GPS ปัจจุบัน'
    case 'search':
      return 'ผลการค้นหา'
    case 'drag':
      return 'การลากหมุด'
    case 'manual':
      return 'พิกัดที่กรอก'
    case 'map':
    default:
      return 'แผนที่'
  }
}

export function GpsPicker({ value, onChange }: GpsPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const markerIconRef = useRef<DivIcon | null>(null)
  const reverseRequestRef = useRef(0)
  const searchRequestRef = useRef(0)

  const [mapReady, setMapReady] = useState(false)
  const [geolocationSupported, setGeolocationSupported] = useState(false)
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isResolvingLocation, setIsResolvingLocation] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [manualLat, setManualLat] = useState(value?.latitude.toString() ?? '')
  const [manualLng, setManualLng] = useState(value?.longitude.toString() ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setFeedback = (nextMessage = '', nextError: string | null = null) => {
    setMessage(nextMessage)
    setError(nextError)
  }

  const syncMarker = (coords: GpsCoords, shouldFocus = true) => {
    const map = mapRef.current
    if (!map) return

    const latLng: LatLngExpression = [coords.latitude, coords.longitude]
    if (!markerRef.current) {
      void import('leaflet').then((Leaflet) => {
        if (!mapRef.current || markerRef.current) return
        markerIconRef.current = Leaflet.divIcon({
          className: 'scc-location-marker',
          html: '<span aria-hidden="true"></span>',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        })
        markerRef.current = Leaflet.marker(latLng, {
          draggable: true,
          icon: markerIconRef.current,
        }).addTo(mapRef.current)
        markerRef.current.on('dragend', () => {
          const dragged = markerRef.current?.getLatLng()
          if (!dragged) return
          void applySelectedLocation(dragged.lat, dragged.lng, { source: 'drag', resolveName: true })
        })
      })
    } else {
      markerRef.current.setLatLng(latLng)
    }

    if (shouldFocus) {
      map.setView(latLng, FOCUSED_MAP_ZOOM)
    }
  }

  const reverseGeocode = async (coords: GpsCoords, source: LocationSource) => {
    const requestId = ++reverseRequestRef.current
    setIsResolvingLocation(true)
    setFeedback('กำลังค้นหาชื่อสถานที่จากพิกัด...', null)

    try {
      const res = await fetch(`/api/location?mode=reverse&lat=${coords.latitude}&lng=${coords.longitude}`)
      const json = (await res.json()) as { result?: LocationSearchResult; error?: string }
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถค้นหาสถานที่ได้')
      if (requestId !== reverseRequestRef.current) return

      if (json.result?.label) {
        onChange({ ...coords, label: json.result.label })
        setFeedback(`อัปเดตชื่อสถานที่จาก${sourceLabel(source)}แล้ว`, null)
      } else {
        onChange(coords)
        setFeedback('บันทึกพิกัดแล้ว สามารถระบุชื่อสถานที่ในหมายเหตุได้', null)
      }
    } catch {
      if (requestId !== reverseRequestRef.current) return
      onChange(coords)
      setFeedback('', 'เลือกพิกัดแล้ว แต่ค้นหาชื่อสถานที่ไม่สำเร็จ')
    } finally {
      if (requestId === reverseRequestRef.current) {
        setIsResolvingLocation(false)
      }
    }
  }

  const applySelectedLocation = async (
    latitude: number,
    longitude: number,
    options: { source: LocationSource; resolveName: boolean; label?: string; accuracy?: number },
  ) => {
    const coords: GpsCoords = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      ...(options.accuracy ? { accuracy: options.accuracy } : {}),
      ...(options.label ? { label: options.label } : {}),
    }

    setManualLat(String(coords.latitude))
    setManualLng(String(coords.longitude))
    setResults([])
    setError(null)
    syncMarker(coords)

    if (options.label) {
      onChange(coords)
      setFeedback(`อัปเดตชื่อสถานที่จาก${sourceLabel(options.source)}แล้ว`, null)
      return
    }

    if (options.resolveName) {
      await reverseGeocode(coords, options.source)
      return
    }

    onChange(coords)
    setFeedback('บันทึกพิกัดแล้ว', null)
  }

  useEffect(() => {
    setGeolocationSupported(typeof navigator !== 'undefined' && 'geolocation' in navigator)
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || process.env.NODE_ENV === 'test') return

    let cancelled = false
    void import('leaflet').then((Leaflet) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return
      const map = Leaflet.map(mapContainerRef.current, {
        center: value ? [value.latitude, value.longitude] : DEFAULT_MAP_CENTER,
        zoom: value ? FOCUSED_MAP_ZOOM : DEFAULT_MAP_ZOOM,
        zoomControl: true,
      })
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
      map.on('click', (event: LeafletMouseEvent) => {
        void applySelectedLocation(event.latlng.lat, event.latlng.lng, { source: 'map', resolveName: true })
      })
      mapRef.current = map
      setMapReady(true)
      if (value) syncMarker(value, true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // initialize once; value changes are synced below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (value) {
      setManualLat(String(value.latitude))
      setManualLng(String(value.longitude))
      syncMarker(value, false)
    }
    // syncMarker is intentionally kept outside deps; map/marker refs are mutable Leaflet objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setFeedback('', 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS')
      return
    }

    setIsGettingCurrentLocation(true)
    setFeedback('กำลังดึงพิกัด GPS ปัจจุบัน...', null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingCurrentLocation(false)
        void applySelectedLocation(pos.coords.latitude, pos.coords.longitude, {
          source: 'gps',
          resolveName: true,
          accuracy: pos.coords.accuracy,
        })
      },
      () => {
        setIsGettingCurrentLocation(false)
        setFeedback('', 'ไม่สามารถดึง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งหรือเลือกจากแผนที่แทน')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }

  const searchLocation = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setResults([])
      setFeedback('', 'กรุณากรอกคำค้นหาอย่างน้อย 3 ตัวอักษร')
      return
    }

    const requestId = ++searchRequestRef.current
    setIsSearching(true)
    setFeedback('กำลังค้นหาสถานที่...', null)
    try {
      const res = await fetch(`/api/location?mode=search&q=${encodeURIComponent(trimmed)}`)
      const json = (await res.json()) as { results?: LocationSearchResult[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถค้นหาสถานที่ได้')
      if (requestId !== searchRequestRef.current) return

      const nextResults = json.results ?? []
      setResults(nextResults)
      setFeedback(
        nextResults.length > 0
          ? `พบ ${nextResults.length} สถานที่ เลือกจากรายการด้านล่างได้เลย`
          : 'ไม่พบสถานที่ที่ค้นหา ลองเปลี่ยนคำค้นหรือเลือกบนแผนที่แทน',
        null,
      )
    } catch (err) {
      if (requestId !== searchRequestRef.current) return
      setResults([])
      setFeedback('', err instanceof Error ? err.message : 'ไม่สามารถค้นหาสถานที่ได้')
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false)
    }
  }

  const pinManualCoords = () => {
    const latitude = Number(manualLat)
    const longitude = Number(manualLng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFeedback('', 'กรุณากรอกละติจูด/ลองจิจูดให้ถูกต้อง')
      return
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setFeedback('', 'พิกัดอยู่นอกช่วงที่ถูกต้อง')
      return
    }
    void applySelectedLocation(latitude, longitude, { source: 'manual', resolveName: false })
  }

  const openMap = () => {
    if (!value) return
    window.open(`https://www.google.com/maps?q=${value.latitude},${value.longitude}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-pea-100 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-pea-800">พิกัด GPS และแผนที่</h3>
            <p className="text-xs text-gray-500">ใช้ GPS ปัจจุบัน ค้นหาสถานที่ หรือคลิก/ลากหมุดบนแผนที่</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Crosshair className="h-4 w-4" />}
            loading={isGettingCurrentLocation}
            disabled={!geolocationSupported || isGettingCurrentLocation}
            onClick={() => void handleUseCurrentLocation()}
            className="shrink-0"
          >
            {isGettingCurrentLocation ? 'กำลังดึง GPS...' : 'ใช้ GPS ปัจจุบัน'}
          </Button>
        </div>

        <div className="mb-3 flex gap-2">
          <Input
            aria-label="ค้นหาสถานที่"
            placeholder="ค้นหาสถานที่ เช่น โรงพยาบาล, ถนน, ตำบล"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void searchLocation()
              }
            }}
            className="h-11"
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<Search className="h-4 w-4" />}
            loading={isSearching}
            disabled={isSearching}
            onClick={() => void searchLocation()}
            className="shrink-0"
          >
            {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mb-3 max-h-56 space-y-2 overflow-y-auto" role="listbox" aria-label="ผลการค้นหาตำแหน่ง">
            {results.map((result) => (
              <button
                key={`${result.latitude}-${result.longitude}-${result.label}`}
                type="button"
                onClick={() => void applySelectedLocation(result.latitude, result.longitude, {
                  source: 'search',
                  resolveName: false,
                  label: result.label,
                })}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-pea-100 bg-white px-3 py-2 text-left transition hover:border-pea-500 hover:bg-pea-50"
              >
                <span className="line-clamp-2 text-sm text-gray-800">{result.label}</span>
                <small className="shrink-0 font-mono text-[11px] text-pea-700">
                  {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                </small>
              </button>
            ))}
          </div>
        )}

        {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
        {message && (
          <p className="mb-3 rounded-xl bg-pea-50 px-3 py-2 text-xs text-pea-800">
            {message}{isResolvingLocation ? '…' : ''}
          </p>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
          <div ref={mapContainerRef} className="h-64 w-full" aria-label="แผนที่เลือกพิกัด GPS" />
          {process.env.NODE_ENV === 'test' && <div className="p-4 text-sm text-gray-500">แผนที่เลือกพิกัด GPS</div>}
          {!mapReady && process.env.NODE_ENV !== 'test' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-500">
              กำลังโหลดแผนที่...
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <span className="block text-[11px] text-gray-500">Latitude</span>
            <strong className="font-mono text-xs text-gray-900">{value ? value.latitude.toFixed(6) : '-'}</strong>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <span className="block text-[11px] text-gray-500">Longitude</span>
            <strong className="font-mono text-xs text-gray-900">{value ? value.longitude.toFixed(6) : '-'}</strong>
          </div>
        </div>

        {value?.label && <p className="mt-2 text-xs text-gray-600">สถานที่: {value.label}</p>}
        {value && (
          <button
            type="button"
            onClick={openMap}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 transition hover:bg-green-100"
          >
            <MapPin className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
            <span className="font-mono text-xs tabular-nums">{formatCoords(value)}</span>
            {value.accuracy && <span className="ml-auto text-xs text-green-600">±{Math.round(value.accuracy)}m</span>}
          </button>
        )}

        <details className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">กรอกพิกัดเอง ถ้าแผนที่/GPS ใช้ไม่ได้</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Input
              aria-label="ละติจูด"
              inputMode="decimal"
              placeholder="ละติจูด"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="h-11 font-mono text-sm"
            />
            <Input
              aria-label="ลองจิจูด"
              inputMode="decimal"
              placeholder="ลองจิจูด"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="h-11 font-mono text-sm"
            />
          </div>
          <Button type="button" variant="outline" size="md" onClick={pinManualCoords} fullWidth className="mt-2">
            ปักหมุดจากพิกัดที่กรอก
          </Button>
        </details>
      </div>
    </div>
  )
}
