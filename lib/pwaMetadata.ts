import type { Metadata, Viewport } from 'next'

export const PWA_ICON_METADATA = {
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
} satisfies NonNullable<Metadata['icons']>

// Do not set maximumScale/userScalable: users must be able to zoom field
// screens and dense operational data to their preferred reading size.
export const PWA_VIEWPORT: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
}
