'use client'

import { useEffect, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface QrScannerProps {
  onScan: (code: string) => void
  onError?: (err: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
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
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปิดกล้องได้'
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

  return (
    <>
      <Button
        size="xl"
        fullWidth
        leftIcon={<Camera className="w-6 h-6" />}
        onClick={handleOpen}
        className="h-16 text-lg"
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
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">สแกน QR Code</h2>
              <button
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
