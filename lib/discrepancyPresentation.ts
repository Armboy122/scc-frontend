import type { DiscrepancyStatus, DiscrepancyType, ManualDiscrepancyType } from './types'

export const MANUAL_DISCREPANCY_OPTIONS: Array<{ value: ManualDiscrepancyType; label: string }> = [
  { value: 'UNEXPECTED_COVER', label: 'พบฉนวนเกินจากที่คาด' },
  { value: 'MISSING_COVER', label: 'ไม่พบฉนวนที่ควรมี' },
  { value: 'OTHER', label: 'ข้อสังเกตอื่น' },
]

const TYPE_LABELS: Record<DiscrepancyType, string> = {
  UNEXPECTED_COVER: 'พบฉนวนเกิน',
  MISSING_COVER: 'ฉนวนขาดจากที่คาด',
  CAPACITY_SHORTFALL: 'กำลังสำรองไม่พอ',
  OTHER: 'ข้อสังเกตอื่น',
}

const STATUS_LABELS: Record<DiscrepancyStatus, string> = {
  OPEN: 'รอตรวจสอบ',
  RESOLVED: 'ปิดเรื่องแล้ว',
}

export function getDiscrepancyTypeLabel(type: DiscrepancyType): string {
  return TYPE_LABELS[type]
}

export function getDiscrepancyStatusLabel(status: DiscrepancyStatus): string {
  return STATUS_LABELS[status]
}

export function formatDiscrepancyDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
