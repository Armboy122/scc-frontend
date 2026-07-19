'use client'

import { useId, useState } from 'react'
import { isoDateToThaiBuddhist, thaiBuddhistToIsoDate } from '@/lib/thaiDate'

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

export function ThaiDatePicker({ label, value, onChange, error, hint, required, min }: {
  label: string; value?: string; onChange: (value: string) => void; error?: string; hint?: string; required?: boolean; min?: string
}) {
  const id = useId()
  const selected = isoDateToThaiBuddhist(value)
  const [draft, setDraft] = useState<{ day?: number; month?: number; year?: number }>(selected ?? {})
  const minYear = isoDateToThaiBuddhist(min)?.year
  const currentYear = new Date().getFullYear() + 543
  const years = Array.from({ length: 111 }, (_, index) => currentYear - 10 + index).filter((year) => !minYear || year >= minYear)
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  const update = (next: Partial<typeof draft>) => {
    const date = { ...draft, ...next }
    setDraft(date)
    if (!date.day || !date.month || !date.year) {
      onChange('')
      return
    }
    const iso = thaiBuddhistToIsoDate(date.day, date.month, date.year)
    if (iso) onChange(iso)
  }
  return <div className="flex flex-col gap-1">
    <span id={id} className="text-sm font-medium text-gray-700">{label}{required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}</span>
    <div role="group" aria-labelledby={id} className="grid grid-cols-[72px_1fr_92px] gap-2">
      <select aria-label={`${label} วัน`} value={draft.day ?? ''} onChange={(event) => update({ day: Number(event.target.value) || undefined })} className="h-12 rounded-xl border border-gray-300 bg-white px-2 text-base focus:outline-none focus:ring-2 focus:ring-pea-500">
        <option value="">วัน</option>{days.map((day) => <option key={day} value={day}>{day}</option>)}
      </select>
      <select aria-label={`${label} เดือน`} value={draft.month ?? ''} onChange={(event) => update({ month: Number(event.target.value) || undefined })} className="h-12 rounded-xl border border-gray-300 bg-white px-2 text-base focus:outline-none focus:ring-2 focus:ring-pea-500">
        <option value="">เดือน</option>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
      </select>
      <select aria-label={`${label} ปี พ.ศ.`} value={draft.year ?? ''} onChange={(event) => update({ year: Number(event.target.value) || undefined })} className="h-12 rounded-xl border border-gray-300 bg-white px-2 text-base focus:outline-none focus:ring-2 focus:ring-pea-500">
        <option value="">พ.ศ.</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </div>
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>
}
