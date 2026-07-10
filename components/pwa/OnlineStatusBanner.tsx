'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export const RECOVERY_MESSAGE_DURATION_MS = 5_000

type ConnectionStatus = 'online' | 'offline' | 'recovered'

export function OnlineStatusBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('online')

  useEffect(() => {
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined

    const clearRecoveryTimer = () => {
      if (recoveryTimer) clearTimeout(recoveryTimer)
      recoveryTimer = undefined
    }
    const handleOffline = () => {
      clearRecoveryTimer()
      setStatus('offline')
    }
    const handleOnline = () => {
      clearRecoveryTimer()
      setStatus('recovered')
      recoveryTimer = setTimeout(
        () => setStatus('online'),
        RECOVERY_MESSAGE_DURATION_MS,
      )
    }

    setStatus(navigator.onLine ? 'online' : 'offline')
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      clearRecoveryTimer()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (status === 'online') return null

  const offline = status === 'offline'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        'fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-start gap-2 rounded-xl px-4 py-3',
        'text-sm font-medium shadow-lg md:items-center',
        offline
          ? 'border border-amber-300 bg-amber-50 text-amber-950'
          : 'border border-emerald-300 bg-emerald-50 text-emerald-950',
      ].join(' ')}
    >
      {offline ? (
        <WifiOff className="mt-0.5 h-4 w-4 flex-none md:mt-0" aria-hidden />
      ) : (
        <Wifi className="mt-0.5 h-4 w-4 flex-none md:mt-0" aria-hidden />
      )}
      <span>
        {offline
          ? 'ออฟไลน์ — หน้าปัจจุบันอาจยังแสดงอยู่ แต่การดึงหรือบันทึกข้อมูลต้องรออินเทอร์เน็ต'
          : 'กลับมาออนไลน์แล้ว — ระบบไม่ได้ส่งงานให้อัตโนมัติ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'}
      </span>
    </div>
  )
}
