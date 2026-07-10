import { describe, expect, it } from 'vitest'
import { readPhaseFeatureFlags } from './featureFlags'

describe('readPhaseFeatureFlags', () => {
  it.each([
    { value: 'true', expected: true },
    { value: undefined, expected: false },
    { value: '', expected: false },
    { value: 'false', expected: false },
    { value: 'TRUE', expected: false },
    { value: 'True', expected: false },
    { value: '1', expected: false },
    { value: 'yes', expected: false },
    { value: ' true', expected: false },
    { value: 'true ', expected: false },
  ])('enables a flag only for the exact value $value', ({ value, expected }) => {
    expect(readPhaseFeatureFlags({
      NEXT_PUBLIC_ENABLE_PHASE2_BORROWING: value,
      NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION: value,
    })).toEqual({
      phase2Borrowing: expected,
      phase3Expansion: expected,
    })
  })

  it('evaluates Phase 2 and Phase 3 independently', () => {
    expect(readPhaseFeatureFlags({
      NEXT_PUBLIC_ENABLE_PHASE2_BORROWING: 'true',
      NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION: 'false',
    })).toEqual({
      phase2Borrowing: true,
      phase3Expansion: false,
    })

    expect(readPhaseFeatureFlags({
      NEXT_PUBLIC_ENABLE_PHASE2_BORROWING: 'false',
      NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION: 'true',
    })).toEqual({
      phase2Borrowing: false,
      phase3Expansion: true,
    })
  })
})
