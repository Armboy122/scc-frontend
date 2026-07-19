const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidThaiDateInput(value: string): boolean {
  const match = DATE_INPUT_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Database/API contract: Gregorian date-only values are always YYYY-MM-DD. */
export function thaiBuddhistToIsoDate(day: number, month: number, buddhistYear: number): string | undefined {
  const iso = `${String(buddhistYear - 543).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isValidThaiDateInput(iso) ? iso : undefined
}

export function isoDateToThaiBuddhist(value?: string): { day: number; month: number; year: number } | undefined {
  if (!value || !isValidThaiDateInput(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return { day, month, year: year + 543 }
}

export function thaiDateInputToStartOfDayRfc3339(value: string): string {
  if (!isValidThaiDateInput(value)) throw new Error('Invalid Thai business date')
  return `${value}T00:00:00+07:00`
}

export function formatThaiDate(value?: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return 'ยังไม่กำหนด'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'ยังไม่กำหนด'
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric', ...options,
  }).format(date)
}
