'use client'

import { useState } from 'react'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface GpsCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

interface GpsPickerProps {
  value?: GpsCoords | null
  onChange: (coords: GpsCoords | null) => void
}

interface LocationSearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function parseSearchResult(result: LocationSearchResult): GpsCoords {
  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }
}

function formatCoords(value: GpsCoords): string {
  return `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
}

export function GpsPicker({ value, onChange }: GpsPickerProps) {
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [manualLat, setManualLat] = useState(value?.latitude.toString() ?? '')
  const [manualLng, setManualLng] = useState(value?.longitude.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  const updateCoords = (coords: GpsCoords) => {
    setManualLat(coords.latitude.toString())
    setManualLng(coords.longitude.toString())
    onChange(coords)
  }

  const capture = () => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        updateCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        setLoading(false)
        setError(`ไม่สามารถระบุตำแหน่งได้: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const searchLocation = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setError('กรุณาพิมพ์ชื่อตำบล/สถานที่ก่อนค้นหา')
      return
    }

    setSearching(true)
    setError(null)
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('format', 'json')
      url.searchParams.set('countrycodes', 'th')
      url.searchParams.set('limit', '5')
      url.searchParams.set('q', trimmed)

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error('search failed')
      const data = (await res.json()) as LocationSearchResult[]
      setResults(data)
      if (data.length === 0) {
        setError('ไม่พบตำแหน่งที่ค้นหา ลองพิมพ์ชื่อตำบล/อำเภอ/จังหวัดเพิ่ม')
      }
    } catch {
      setError('ค้นหาตำแหน่งไม่สำเร็จ กรุณาลองใหม่หรือกรอกพิกัดเอง')
    } finally {
      setSearching(false)
    }
  }

  const pinResult = (result: LocationSearchResult) => {
    updateCoords(parseSearchResult(result))
    setResults([])
    setQuery(result.display_name)
  }

  const pinManualCoords = () => {
    const latitude = Number(manualLat)
    const longitude = Number(manualLng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('กรุณากรอกละติจูด/ลองจิจูดให้ถูกต้อง')
      return
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setError('พิกัดอยู่นอกช่วงที่ถูกต้อง')
      return
    }
    setError(null)
    updateCoords({ latitude, longitude })
  }

  const openMap = () => {
    if (!value) return
    window.open(
      `https://www.google.com/maps?q=${value.latitude},${value.longitude}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex gap-2">
          <Input
            aria-label="ค้นหาตำบลหรือสถานที่"
            placeholder="ค้นหาตำบล / อำเภอ / จังหวัด"
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
            variant="secondary"
            size="md"
            leftIcon={<Search className="w-4 h-4" />}
            loading={searching}
            onClick={() => void searchLocation()}
            className="shrink-0"
          >
            ค้นหา
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2" role="listbox" aria-label="ผลการค้นหาตำแหน่ง">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => pinResult(result)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-pea-500 hover:bg-pea-50"
              >
                <span className="line-clamp-2">{result.display_name}</span>
                <span className="mt-1 block text-xs font-medium text-pea-700">เลือกปักหมุดนี้</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
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
        <Button type="button" variant="outline" size="md" onClick={pinManualCoords} fullWidth>
          ปักหมุดจากพิกัดที่กรอก
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        leftIcon={<Crosshair className="w-5 h-5" />}
        loading={loading}
        onClick={capture}
        fullWidth
      >
        {value ? 'อัพเดตตำแหน่ง GPS ปัจจุบัน' : 'จับตำแหน่ง GPS ปัจจุบัน'}
      </Button>

      {value && (
        <button
          type="button"
          onClick={openMap}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 hover:bg-green-100 transition-colors"
        >
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />
          <span className="tabular-nums text-xs font-mono">{formatCoords(value)}</span>
          {value.accuracy && (
            <span className="ml-auto text-xs text-green-600">±{Math.round(value.accuracy)}m</span>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
