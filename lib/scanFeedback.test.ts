import { describe, expect, it, vi } from 'vitest'
import { triggerScanFeedback } from './scanFeedback'

describe('triggerScanFeedback', () => {
  it('uses vibration pattern for success feedback when available', () => {
    const vibrate = vi.fn()
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    })

    triggerScanFeedback({ tone: 'success', sound: false })

    expect(vibrate).toHaveBeenCalledWith(80)
  })

  it('can run without sound or vibration support', () => {
    expect(() => triggerScanFeedback({ tone: 'error', sound: false, vibrate: false })).not.toThrow()
  })
})
