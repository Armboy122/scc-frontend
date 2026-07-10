export interface PhaseFeatureFlags {
  phase2Borrowing: boolean
  phase3Expansion: boolean
}

interface PhaseFeatureEnv {
  NEXT_PUBLIC_ENABLE_PHASE2_BORROWING?: string
  NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION?: string
}

export function readPhaseFeatureFlags(
  env: PhaseFeatureEnv = {
    NEXT_PUBLIC_ENABLE_PHASE2_BORROWING: process.env.NEXT_PUBLIC_ENABLE_PHASE2_BORROWING,
    NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION: process.env.NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION,
  },
): PhaseFeatureFlags {
  return {
    phase2Borrowing: env.NEXT_PUBLIC_ENABLE_PHASE2_BORROWING === 'true',
    phase3Expansion: env.NEXT_PUBLIC_ENABLE_PHASE3_EXPANSION === 'true',
  }
}

export const PHASE_FEATURE_FLAGS = readPhaseFeatureFlags()
