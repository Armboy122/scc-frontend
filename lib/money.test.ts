import { describe, expect, it } from 'vitest'
import {
  formatSatangAsBaht,
  isValidOptionalBahtInput,
  parseBahtInputToSatang,
  satangToBahtInput,
} from './money'

describe('exact baht and satang helpers', () => {
  it('parses whole baht and up to two decimal places without floating-point math', () => {
    expect(parseBahtInputToSatang('4066')).toBe(406600)
    expect(parseBahtInputToSatang('321.5')).toBe(32150)
    expect(parseBahtInputToSatang('0.01')).toBe(1)
    expect(parseBahtInputToSatang(' 8239.00 ')).toBe(823900)
  })

  it('rejects negative, grouped, malformed, and over-precision input', () => {
    for (const value of ['-1', '1,000', '.50', '1.', '1.001', 'abc']) {
      expect(parseBahtInputToSatang(value)).toBeUndefined()
      expect(isValidOptionalBahtInput(value)).toBe(false)
    }
    expect(isValidOptionalBahtInput('')).toBe(true)
  })

  it('formats stored satang for editing and Thai-baht display', () => {
    expect(satangToBahtInput(6623300)).toBe('66233.00')
    expect(formatSatangAsBaht(6623300)).toContain('66,233.00')
  })
})
