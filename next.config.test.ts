import { describe, expect, it } from 'vitest'
import nextConfig, { SECURITY_HEADERS } from './next.config'

describe('Next.js security headers', () => {
  it('applies baseline browser protections to every route', async () => {
    expect(nextConfig.headers).toBeTypeOf('function')
    const rules = await nextConfig.headers!()
    expect(rules).toEqual([
      {
        source: '/:path*',
        headers: [...SECURITY_HEADERS],
      },
    ])

    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toEqual({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
    })
  })
})
