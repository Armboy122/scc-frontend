import type { Cover } from './types'

const VERSION = 4
const SIZE = VERSION * 4 + 17
const DATA_CODEWORDS = 80
const ECC_CODEWORDS = 20

type Cell = boolean | null

function utf8Bytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(value))
}

class BitBuffer {
  bits: number[] = []

  append(value: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1)
    }
  }
}

function gfMultiply(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function reedSolomonGenerator(degree: number): number[] {
  const result = Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMultiply(root, 0x02)
  }
  return result
}

function reedSolomonRemainder(data: number[], generator: number[]): number[] {
  const result = Array(generator.length).fill(0)
  for (const value of data) {
    const factor = value ^ result.shift()
    result.push(0)
    generator.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor)
    })
  }
  return result
}

function encodeData(value: string): number[] {
  const bytes = utf8Bytes(value)
  if (bytes.length > 78) {
    throw new Error('QR payload is too long for printable cover label')
  }

  const buffer = new BitBuffer()
  buffer.append(0x4, 4)
  buffer.append(bytes.length, 8)
  bytes.forEach((byte) => buffer.append(byte, 8))

  const capacityBits = DATA_CODEWORDS * 8
  buffer.append(0, Math.min(4, capacityBits - buffer.bits.length))
  while (buffer.bits.length % 8 !== 0) buffer.append(0, 1)

  const data: number[] = []
  for (let i = 0; i < buffer.bits.length; i += 8) {
    data.push(Number.parseInt(buffer.bits.slice(i, i + 8).join(''), 2))
  }
  for (let pad = 0xec; data.length < DATA_CODEWORDS; pad ^= 0xfd) {
    data.push(pad)
  }
  return data
}

function createMatrix(): { modules: Cell[][]; reserved: boolean[][] } {
  const modules = Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null))
  const reserved = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false))

  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark
    reserved[y][x] = true
  }

  const drawFinder = (left: number, top: number) => {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const x = left + dx
        const y = top + dy
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue
        const dark =
          (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
          (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
        setFunction(x, y, dark)
      }
    }
  }

  const drawAlignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(SIZE - 7, 0)
  drawFinder(0, SIZE - 7)
  drawAlignment(26, 26)

  for (let i = 8; i < SIZE - 8; i += 1) {
    setFunction(6, i, i % 2 === 0)
    setFunction(i, 6, i % 2 === 0)
  }
  setFunction(8, VERSION * 4 + 9, true)
  drawFormatBits(modules, reserved)

  return { modules, reserved }
}

function getFormatBits(): number {
  let data = (1 << 3) | 0
  let bits = data << 10
  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) bits ^= 0x537 << (i - 10)
  }
  return ((data << 10) | bits) ^ 0x5412
}

function drawFormatBits(modules: Cell[][], reserved: boolean[][]) {
  const bits = getFormatBits()
  const set = (x: number, y: number, i: number) => {
    modules[y][x] = ((bits >>> i) & 1) !== 0
    reserved[y][x] = true
  }

  for (let i = 0; i <= 5; i += 1) set(8, i, i)
  set(8, 7, 6)
  set(8, 8, 7)
  set(7, 8, 8)
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, i)
  for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, i)
  for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, i)
}

function addData(modules: Cell[][], reserved: boolean[][], codewords: number[]) {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, i) => (codeword >>> (7 - i)) & 1),
  )
  let index = 0

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1
    for (let vert = 0; vert < SIZE; vert += 1) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vert : vert
      for (let j = 0; j < 2; j += 1) {
        const x = right - j
        if (reserved[y][x]) continue
        const bit = index < bits.length ? bits[index] === 1 : false
        modules[y][x] = bit !== ((x + y) % 2 === 0)
        index += 1
      }
    }
  }
}

export function createQrSvg(payload: string, moduleSize = 8, margin = 4): string {
  const data = encodeData(payload)
  const ecc = reedSolomonRemainder(data, reedSolomonGenerator(ECC_CODEWORDS))
  const { modules, reserved } = createMatrix()
  addData(modules, reserved, [...data, ...ecc])

  const size = (SIZE + margin * 2) * moduleSize
  const rects: string[] = []
  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        rects.push(
          `<rect x="${(x + margin) * moduleSize}" y="${(y + margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`,
        )
      }
    })
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${rects.join('')}</g></svg>`
}

export function createCoverLabelSvg(cover: Cover, ownerOfficeName?: string): string {
  const qr = createQrSvg(cover.qrCode, 7, 4)
  const qrBody = qr
    .replace(/^<svg[^>]*>/, '')
    .replace('<rect width="100%" height="100%" fill="#fff"/>', '')
    .replace('</svg>', '')
  const officeLabel = ownerOfficeName?.trim() || cover.ownerOffice?.name || 'สำนักงานไม่ระบุ'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="460" viewBox="0 0 360 460"><rect width="360" height="460" rx="16" fill="#fff"/><rect x="12" y="12" width="336" height="436" rx="12" fill="none" stroke="#111" stroke-width="2"/><g transform="translate(36 34)">${qrBody}</g><text x="180" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111">${escapeXml(cover.assetCode)}</text><text x="180" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#444">${escapeXml(cover.qrCode)}</text><text x="180" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#666">${escapeXml(officeLabel)}</text></svg>`
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function downloadSvg(filename: string, svg: string) {
  const link = document.createElement('a')
  link.href = svgToDataUrl(svg)
  link.download = filename
  link.click()
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
