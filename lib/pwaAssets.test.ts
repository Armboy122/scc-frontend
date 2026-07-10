import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PWA_ICON_METADATA, PWA_VIEWPORT } from './pwaMetadata'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose: string
}

interface AppManifest {
  id: string
  start_url: string
  scope: string
  display: string
  theme_color: string
  background_color: string
  icons: ManifestIcon[]
}

const projectRoot = process.cwd()

function readPngDimensions(relativePath: string): { width: number; height: number } {
  const png = readFileSync(resolve(projectRoot, relativePath))
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  }
}

describe('PWA public assets', () => {
  it('defines an installable same-origin manifest with maskable icons', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(projectRoot, 'public/manifest.json'), 'utf8'),
    ) as AppManifest

    expect(manifest).toMatchObject({
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#6d28a8',
      background_color: '#1e0a30',
    })
    expect(manifest.icons).toEqual([
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ])
  })

  it('ships real PNGs at every declared size, including Apple touch', () => {
    expect(readPngDimensions('public/icons/icon-192.png')).toEqual({
      width: 192,
      height: 192,
    })
    expect(readPngDimensions('public/icons/icon-512.png')).toEqual({
      width: 512,
      height: 512,
    })
    expect(readPngDimensions('public/icons/apple-touch-icon.png')).toEqual({
      width: 180,
      height: 180,
    })
  })

  it('wires browser and Apple metadata to the same public assets', () => {
    expect(PWA_ICON_METADATA).toEqual({
      icon: [
        {
          url: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          url: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      apple: [
        {
          url: '/icons/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        },
      ],
    })
  })

  it('keeps the viewport zoomable for accessibility', () => {
    expect(PWA_VIEWPORT).toEqual({
      themeColor: '#6d28a8',
      width: 'device-width',
      initialScale: 1,
    })
    expect(PWA_VIEWPORT).not.toHaveProperty('maximumScale')
    expect(PWA_VIEWPORT).not.toHaveProperty('userScalable')
  })
})
