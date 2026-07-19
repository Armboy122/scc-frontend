import { PHASE_FEATURE_FLAGS, type PhaseFeatureFlags } from '@/lib/featureFlags'

export function isAdminLinkEnabled(
  feature: keyof PhaseFeatureFlags | undefined,
  flags: PhaseFeatureFlags = PHASE_FEATURE_FLAGS,
) {
  return !feature || flags[feature]
}
