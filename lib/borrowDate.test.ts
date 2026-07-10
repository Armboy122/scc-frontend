import { describe, expect, it } from 'vitest'
import {
  bangkokTodayDateInput,
  isFutureThaiBusinessDate,
  isValidDateInput,
  requestedQtyPrefillToNumber,
  returnDatePrefillToDateInput,
  thaiDateInputToEndOfDayRfc3339,
} from './borrowDate'

describe('Thai borrow return date contract', () => {
  it('converts a Thai date input to the deterministic end of business day offset', () => {
    expect(thaiDateInputToEndOfDayRfc3339('2026-08-31')).toBe(
      '2026-08-31T23:59:59+07:00',
    )
  })

  it('validates the calendar date instead of accepting JavaScript rollover', () => {
    expect(isValidDateInput('2028-02-29')).toBe(true)
    expect(isValidDateInput('2026-02-29')).toBe(false)
    expect(isValidDateInput('2026-13-01')).toBe(false)
    expect(isValidDateInput('31/08/2026')).toBe(false)
    expect(() => thaiDateInputToEndOfDayRfc3339('2026-02-29')).toThrow(
      'Invalid Thai business date',
    )
  })

  it('turns RFC 3339 prefill values into the Bangkok calendar date', () => {
    expect(returnDatePrefillToDateInput('2026-08-31')).toBe('2026-08-31')
    expect(returnDatePrefillToDateInput('2026-08-31T18:00:00Z')).toBe('2026-09-01')
    expect(returnDatePrefillToDateInput('not-a-date')).toBeUndefined()
  })

  it('requires a future Thai end-of-day instant and derives the Bangkok calendar day', () => {
    const now = new Date('2026-07-10T12:00:00+07:00')
    expect(isFutureThaiBusinessDate('2026-07-10', now)).toBe(true)
    expect(isFutureThaiBusinessDate('2026-07-09', now)).toBe(false)
    expect(isFutureThaiBusinessDate('invalid', now)).toBe(false)
    expect(bangkokTodayDateInput(new Date('2026-07-09T18:00:00Z'))).toBe('2026-07-10')
  })

  it('accepts only safe positive integer quantity prefills', () => {
    expect(requestedQtyPrefillToNumber('12')).toBe(12)
    expect(requestedQtyPrefillToNumber('0')).toBeUndefined()
    expect(requestedQtyPrefillToNumber('-1')).toBeUndefined()
    expect(requestedQtyPrefillToNumber('1.5')).toBeUndefined()
    expect(requestedQtyPrefillToNumber('9007199254740992')).toBeUndefined()
  })
})
