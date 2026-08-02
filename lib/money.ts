const BAHT_INPUT_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/

const bahtFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function parseBahtInputToSatang(value: string): number | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  const match = BAHT_INPUT_PATTERN.exec(normalized)
  if (!match) return undefined
  const [bahtPart, fraction = ''] = normalized.split('.')
  const satang = Number(bahtPart) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(satang) ? satang : undefined
}

export function isValidOptionalBahtInput(value: string): boolean {
  return value.trim() === '' || parseBahtInputToSatang(value) !== undefined
}

export function satangToBahtInput(value?: number | null): string {
  if (value === undefined || value === null) return ''
  const baht = Math.trunc(value / 100)
  const satang = Math.abs(value % 100)
  return `${baht}.${String(satang).padStart(2, '0')}`
}

export function formatSatangAsBaht(value: number): string {
  return `${bahtFormatter.format(value / 100)} บาท`
}
