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
  // next-pwa is included as a dependency (optional PWA support).
  // To enable PWA, install @ducanh2912/next-pwa and wrap this config:
  //   import withPWA from '@ducanh2912/next-pwa'
  //   export default withPWA({ dest: 'public' })(nextConfig)
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
