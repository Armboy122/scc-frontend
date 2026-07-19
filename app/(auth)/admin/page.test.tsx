import { describe, expect, it } from 'vitest'
import { isAdminLinkEnabled } from './adminLinks'

describe('AdminMorePage links', () => {
  it('hides Reports while its Phase 3 route is unavailable', () => {
    expect(isAdminLinkEnabled('phase3Expansion', {
      phase2Borrowing: false,
      phase3Expansion: false,
    })).toBe(false)
  })

  it('shows Reports when the Phase 3 route is enabled', () => {
    expect(isAdminLinkEnabled('phase3Expansion', {
      phase2Borrowing: false,
      phase3Expansion: true,
    })).toBe(true)
  })
})
