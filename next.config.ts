import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // next-pwa is included as a dependency (optional PWA support).
  // To enable PWA, install @ducanh2912/next-pwa and wrap this config:
  //   import withPWA from '@ducanh2912/next-pwa'
  //   export default withPWA({ dest: 'public' })(nextConfig)
  images: {
    remotePatterns: [],
  },
  experimental: {
    // Server Actions are enabled by default in Next.js 15
  },
}

export default nextConfig
