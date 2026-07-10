const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDateInput(value: string): boolean {
  const match = DATE_INPUT_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export function thaiDateInputToEndOfDayRfc3339(value: string): string {
  if (!isValidDateInput(value)) {
    throw new Error('Invalid Thai business date')
  }

  return `${value}T23:59:59+07:00`
}

export function isFutureThaiBusinessDate(value: string, now: Date = new Date()): boolean {
  if (!isValidDateInput(value)) return false
  return new Date(thaiDateInputToEndOfDayRfc3339(value)).getTime() > now.getTime()
}

export function bangkokTodayDateInput(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function returnDatePrefillToDateInput(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (isValidDateInput(value)) return value

  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return undefined

  const dateInput = bangkokTodayDateInput(instant)

  return isValidDateInput(dateInput) ? dateInput : undefined
}

export function requestedQtyPrefillToNumber(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined

  const quantity = Number(value)
  return Number.isSafeInteger(quantity) ? quantity : undefined
}
