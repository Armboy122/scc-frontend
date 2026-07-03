'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PhotoCaptureProps {
  onChange: (file: File | null) => void
  value?: File | null
  disabled?: boolean
}

export function PhotoCapture({ onChange, value, disabled = false }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const file = e.target.files?.[0] ?? null
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      onChange(file)
    }
  }

  const handleRemove = () => {
    if (disabled) return
    onChange(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        id="photo-capture-input"
        aria-label="ถ่ายภาพประกอบ"
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="ภาพถ่าย"
            className="w-full max-h-48 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="ลบภาพ"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          leftIcon={<Camera className="w-5 h-5" />}
          fullWidth
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          ถ่ายภาพประกอบ
        </Button>
      )}

      {value && (
        <p className="text-xs text-gray-500 text-center">
          {value.name} ({(value.size / 1024).toFixed(0)} KB)
        </p>
      )}
    </div>
  )
}
