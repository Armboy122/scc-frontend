import { describe, expect, it } from 'vitest'
import { readNdefText } from './nfc'

function dataView(value: string): DataView {
  const bytes = new TextEncoder().encode(value)
  return new DataView(bytes.buffer)
}

describe('readNdefText', () => {
  it('reads a Web NFC text record payload', () => {
    expect(readNdefText({
      recordType: 'text',
      encoding: 'utf-8',
      data: dataView('PEA0000000001'),
    })).toBe('PEA0000000001')
  })

  it('returns null for a record without readable text', () => {
    expect(readNdefText({ recordType: 'empty' })).toBeNull()
  })
})
