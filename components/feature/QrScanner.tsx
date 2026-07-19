'use client'

import { useEffect, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface QrScannerProps {
  onScan: (code: string) => void
  onError?: (err: string) => void
}

function getCameraErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '')

  if (/notallowed|permission|denied/i.test(message)) {
    return 'ไม่ได้รับอนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องในการตั้งค่า แล้วลองใหม่'
  }
  if (/notfound|no.*camera|device.*not.*found/i.test(message)) {
    return 'ไม่พบกล้องบนอุปกรณ์นี้ — ตรวจสอบว่ามีกล้องพร้อมใช้งาน แล้วลองใหม่'
  }
  if (/notreadable|in use|track.*start/i.test(message)) {
    return 'กล้องกำลังถูกใช้งานโดยแอปอื่น — ปิดแอปนั้นแล้วลองใหม่'
  }

  return 'ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่'
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const containerId = 'qr-scanner-container'

  const startScanner = async () => {
    setError(null)
    try {
      // Dynamically import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          void stopScanner()
          onScan(decodedText.trim())
        },
        undefined,
      )
    } catch (err: unknown) {
      const msg = getCameraErrorMessage(err)
      setError(msg)
      onError?.(msg)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = async () => {
    await stopScanner()
    setIsOpen(false)
    setError(null)
  }

  // Start scanner after modal opens
  useEffect(() => {
    if (isOpen) {
      void startScanner()
    }
    return () => {
      void stopScanner()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void handleClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (trigger?.isConnected) trigger.focus()
    }
  // `handleClose` deliberately uses the scanner instance current at the time of closing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <>
      <Button
        size="xl"
        fullWidth
        leftIcon={<Camera className="w-6 h-6" />}
        onClick={handleOpen}
        className="h-16 text-lg"
        ref={triggerRef}
      >
        สแกน QR Code
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="สแกน QR Code"
        >
          <div ref={panelRef} className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">สแกน QR Code</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => void handleClose()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="ปิด"
              >
                <X className="w-5 h-5 text-gray-500" aria-hidden />
              </button>
            </div>

            {/* Scanner area */}
            <div className="p-4">
              <div id={containerId} className="w-full rounded-xl overflow-hidden" />
              {error && (
                <p className="mt-3 text-sm text-red-600 text-center" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="px-4 pb-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => void handleClose()}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
