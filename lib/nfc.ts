export type NdefRecord = {
  recordType: string
  data?: DataView | null
  encoding?: string
}

export type NdefWriter = {
  write: (message: string) => Promise<void>
}

/** Returns the text payload that Chrome exposes for an NDEF record. */
export function readNdefText(record: NdefRecord): string | null {
  if (!record.data) return null

  try {
    // Web NFC already removes the NDEF text record's status byte and language
    // tag. `record.data` is only the text payload; its character set is in
    // `record.encoding`.
    return new TextDecoder(record.recordType === 'text' ? record.encoding : undefined)
      .decode(record.data)
      .trim() || null
  } catch {
    return null
  }
}
