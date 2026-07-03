'use client'

import { X, CheckCircle2 } from 'lucide-react'

export interface ScannedCover {
  code: string
  coverId?: string
  scannedAt: Date
}

interface CoverScanListProps {
  covers: ScannedCover[]
  onRemove: (code: string) => void
  /** When true the remove button is hidden (removal flow — can't unscan) */
  readOnly?: boolean
}

export function CoverScanList({ covers, onRemove, readOnly = false }: CoverScanListProps) {
  if (covers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" aria-hidden />
        <p className="text-sm">ยังไม่มีฉนวนที่สแกน</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2" aria-label="รายการฉนวนที่สแกนแล้ว">
      {covers.map((cover, i) => (
        <li
          key={cover.code}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 animate-slide-up"
          style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
        >
          {/* Index */}
          <span
            className="w-6 h-6 rounded-full bg-pea-100 text-pea-700 text-xs font-bold flex-shrink-0 flex items-center justify-center"
            aria-hidden
          >
            {i + 1}
          </span>

          {/* Code */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-medium text-gray-900 truncate">{cover.code}</p>
            <p className="text-xs text-gray-400">
              {cover.scannedAt.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>

          {/* Remove */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(cover.code)}
              className="min-h-11 min-w-11 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 inline-flex items-center justify-center"
              aria-label={`ยกเลิกสแกน ${cover.code}`}
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
