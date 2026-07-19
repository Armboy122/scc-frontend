import { describe, expect, it } from 'vitest'
import { formatThaiDate, isoDateToThaiBuddhist, thaiBuddhistToIsoDate, thaiDateInputToStartOfDayRfc3339 } from './thaiDate'

describe('Thai Buddhist date presentation', () => {
  it('converts only at the UI boundary and preserves Gregorian API values', () => {
    expect(thaiBuddhistToIsoDate(29, 2, 2567)).toBe('2024-02-29')
    expect(isoDateToThaiBuddhist('2024-02-29')).toEqual({ day: 29, month: 2, year: 2567 })
    expect(thaiDateInputToStartOfDayRfc3339('2024-02-29')).toBe('2024-02-29T00:00:00+07:00')
  })
  it('rejects invalid Buddhist leap days and formats Bangkok dates with Buddhist years', () => {
    expect(thaiBuddhistToIsoDate(29, 2, 2569)).toBeUndefined()
    expect(formatThaiDate('2026-07-19T00:00:00+07:00')).toContain('2569')
  })
})
