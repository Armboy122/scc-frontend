'use client'

import { useState } from 'react'
import { Crosshair, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface GpsCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

interface GpsPickerProps {
  value?: GpsCoords | null
  onChange: (coords: GpsCoords | null) => void
}

export function GpsPicker({ value, onChange }: GpsPickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        onChange({
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

  const openMap = () => {
    if (!value) return
    window.open(
      `https://www.google.com/maps?q=${value.latitude},${value.longitude}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        leftIcon={<Crosshair className="w-5 h-5" />}
        loading={loading}
        onClick={capture}
        fullWidth
      >
        {value ? 'อัพเดตตำแหน่ง GPS' : 'จับตำแหน่ง GPS'}
      </Button>

      {value && (
        <button
          type="button"
          onClick={openMap}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 hover:bg-green-100 transition-colors"
        >
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />
          <span className="tabular-nums text-xs font-mono">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </span>
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
