import type { NextConfig } from 'next'

export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Field workflows require same-origin camera and geolocation. Explicitly
    // disable capabilities the application does not use.
    value: 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
  },
] as const

const nextConfig: NextConfig = {
  // The repository-owned static service worker in public/sw.js deliberately
  // avoids a build-time Workbox/next-pwa dependency.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.103.117.151.158.sslip.io',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...SECURITY_HEADERS],
      },
    ]
  },
  experimental: {
    // Server Actions are enabled by default in Next.js 15
  },
}

export default nextConfig
