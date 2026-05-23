/**
 * Centralized feature flags. Replace with a runtime provider
 * (GrowthBook, LaunchDarkly, Supabase row) when needed.
 */
export const features = {
  aiVisibility: { enabled: true },
  seoAudit: { enabled: true },
  competitorTracking: { enabled: false },
  brandSentiment: { enabled: false },
  whiteLabel: { enabled: false },
} as const;

export type FeatureKey = keyof typeof features;

export const isFeatureEnabled = (key: FeatureKey): boolean =>
  features[key].enabled;
