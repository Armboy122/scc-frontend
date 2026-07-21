'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatThaiDate } from '@/lib/thaiDate'

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function dateAtUtc(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthFrom(value?: string) {
  const date = value ? dateAtUtc(value) : new Date()
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

export function ThaiDateRangePicker({
  installDate,
  removalDate,
  onChange,
  installError,
  removalError,
}: {
  installDate?: string
  removalDate?: string
  onChange: (range: { installDate: string; removalDate: string }) => void
  installError?: string
  removalError?: string
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => monthFrom(installDate))

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const days = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
    const totalDays = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()
    return Array.from({ length: firstWeekday + totalDays }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1)
  }, [view])

  const selectDay = (day: number) => {
    const selected = isoDate(view.year, view.month, day)
    if (!installDate || removalDate) {
      onChange({ installDate: selected, removalDate: '' })
      return
    }
    if (selected > installDate) {
      onChange({ installDate, removalDate: selected })
      setOpen(false)
    } else if (selected < installDate) {
      onChange({ installDate: selected, removalDate: '' })
    }
  }

  const changeMonth = (offset: number) => {
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + offset, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    })
  }

  const label = installDate && removalDate
    ? `${formatThaiDate(installDate)} — ${formatThaiDate(removalDate)}`
    : installDate
      ? `${formatThaiDate(installDate)} — เลือกวันถอด`
      : 'เลือกวันติดตั้งและวันถอด'
  const error = removalError || installError

  return <div ref={rootRef} className="relative">
    <span id={id} className="mb-1.5 block text-sm font-medium text-gray-700">ระยะเวลาติดตั้ง <span className="ml-0.5 text-red-500" aria-hidden>*</span></span>
    <button
      type="button"
      aria-labelledby={id}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => {
        setView(monthFrom(installDate))
        setOpen((value) => !value)
      }}
      className={['flex h-12 w-full items-center gap-3 rounded-xl border bg-white px-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-pea-500', error ? 'border-red-400' : 'border-gray-300 hover:border-pea-400'].join(' ')}
    >
      <CalendarDays className="h-5 w-5 shrink-0 text-pea-600" aria-hidden />
      <span className={installDate ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
    </button>
    {installDate && removalDate && <p className="mt-1.5 text-xs text-gray-500">เช่า {Math.round((dateAtUtc(removalDate).getTime() - dateAtUtc(installDate).getTime()) / 86_400_000)} วัน</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}

    {open && <>
      <button type="button" aria-label="ปิดปฏิทิน" onClick={() => setOpen(false)} className="fixed inset-0 z-[1090] cursor-default bg-slate-950/20 backdrop-blur-[1px]" />
      <div role="dialog" aria-modal="true" aria-label="เลือกวันติดตั้งและวันถอด" className="fixed inset-x-4 top-1/2 z-[1100] max-h-[calc(100dvh-2rem)] -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า" className="rounded-lg p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pea-500"><ChevronLeft className="h-5 w-5" /></button>
        <p className="font-semibold text-gray-900">{MONTHS[view.month]} {view.year + 543}</p>
        <button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป" className="rounded-lg p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pea-500"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <p className="mb-3 text-xs text-gray-500">{!installDate || removalDate ? 'เลือกวันติดตั้ง' : 'เลือกวันถอด (ต้องหลังวันติดตั้ง)'}</p>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">{WEEKDAYS.map((day) => <span key={day} className="pb-2">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />
          const value = isoDate(view.year, view.month, day)
          const isStart = value === installDate
          const isEnd = value === removalDate
          const inRange = Boolean(installDate && removalDate && value > installDate && value < removalDate)
          return <button key={value} type="button" onClick={() => selectDay(day)} aria-label={`เลือกวันที่ ${day} ${MONTHS[view.month]} ${view.year + 543}`} aria-pressed={isStart || isEnd} className={['relative h-10 text-sm transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-pea-500', inRange ? 'bg-pea-50 text-pea-800' : 'hover:bg-gray-100', isStart || isEnd ? 'rounded-full bg-pea-600 font-semibold text-white hover:bg-pea-700' : 'rounded-md'].join(' ')}>{day}</button>
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">เลือก 2 วันเพื่อกำหนดช่วงเวลา</p>
        {(installDate || removalDate) && <button type="button" onClick={() => onChange({ installDate: '', removalDate: '' })} className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"><X className="h-3.5 w-3.5" />ล้าง</button>}
      </div>
      </div>
    </>}
  </div>
}
