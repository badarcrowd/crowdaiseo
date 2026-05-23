import type { PlanTier } from "@prisma/client";

export type PlanLimits = {
  // Resource limits
  projects: number; // max active projects (-1 = unlimited)
  seats: number; // max workspace members (-1 = unlimited)
  // Monthly usage limits (-1 = unlimited)
  scansPerMonth: number;
  promptRunsPerMonth: number;
  reportsPerMonth: number;
  // AI providers accessible
  aiProviders: number; // max concurrent providers
  // Feature flags
  whiteLabel: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  scheduledReports: boolean;
  exportBranding: boolean; // watermark-free exports
  advancedAnalytics: boolean;
  ssoEnabled: boolean;
  auditLog: boolean;
  prioritySupport: boolean;
  dedicatedCsm: boolean; // customer success manager
  customContracts: boolean;
  // Overage — when limits are exceeded
  allowOverage: boolean;
  overage: {
    scanCostUsdCents: number; // per scan over limit
    reportCostUsdCents: number;
  } | null;
  // Trial
  trialDays: number;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    projects: 1,
    seats: 1,
    scansPerMonth: 10,
    promptRunsPerMonth: 50,
    reportsPerMonth: 3,
    aiProviders: 1,
    whiteLabel: false,
    customDomain: false,
    apiAccess: false,
    scheduledReports: false,
    exportBranding: false,
    advancedAnalytics: false,
    ssoEnabled: false,
    auditLog: false,
    prioritySupport: false,
    dedicatedCsm: false,
    customContracts: false,
    allowOverage: false,
    overage: null,
    trialDays: 0,
  },

  STARTER: {
    projects: 3,
    seats: 3,
    scansPerMonth: 50,
    promptRunsPerMonth: 500,
    reportsPerMonth: 15,
    aiProviders: 2,
    whiteLabel: false,
    customDomain: false,
    apiAccess: false,
    scheduledReports: true,
    exportBranding: false,
    advancedAnalytics: false,
    ssoEnabled: false,
    auditLog: false,
    prioritySupport: false,
    dedicatedCsm: false,
    customContracts: false,
    allowOverage: false,
    overage: null,
    trialDays: 7,
  },

  PRO: {
    projects: 10,
    seats: 5,
    scansPerMonth: 200,
    promptRunsPerMonth: 2000,
    reportsPerMonth: 50,
    aiProviders: 4,
    whiteLabel: false,
    customDomain: false,
    apiAccess: true,
    scheduledReports: true,
    exportBranding: true,
    advancedAnalytics: true,
    ssoEnabled: false,
    auditLog: true,
    prioritySupport: false,
    dedicatedCsm: false,
    customContracts: false,
    allowOverage: true,
    overage: { scanCostUsdCents: 50, reportCostUsdCents: 200 },
    trialDays: 7,
  },

  AGENCY: {
    projects: 50,
    seats: 20,
    scansPerMonth: 1000,
    promptRunsPerMonth: 10000,
    reportsPerMonth: 200,
    aiProviders: 4,
    whiteLabel: true,
    customDomain: true,
    apiAccess: true,
    scheduledReports: true,
    exportBranding: true,
    advancedAnalytics: true,
    ssoEnabled: false,
    auditLog: true,
    prioritySupport: true,
    dedicatedCsm: false,
    customContracts: false,
    allowOverage: true,
    overage: { scanCostUsdCents: 30, reportCostUsdCents: 150 },
    trialDays: 7,
  },

  // Legacy alias — same as AGENCY
  BUSINESS: {
    projects: 50,
    seats: 20,
    scansPerMonth: 1000,
    promptRunsPerMonth: 10000,
    reportsPerMonth: 200,
    aiProviders: 4,
    whiteLabel: true,
    customDomain: true,
    apiAccess: true,
    scheduledReports: true,
    exportBranding: true,
    advancedAnalytics: true,
    ssoEnabled: false,
    auditLog: true,
    prioritySupport: true,
    dedicatedCsm: false,
    customContracts: false,
    allowOverage: true,
    overage: { scanCostUsdCents: 30, reportCostUsdCents: 150 },
    trialDays: 7,
  },

  ENTERPRISE: {
    projects: -1,
    seats: -1,
    scansPerMonth: -1,
    promptRunsPerMonth: -1,
    reportsPerMonth: -1,
    aiProviders: 4,
    whiteLabel: true,
    customDomain: true,
    apiAccess: true,
    scheduledReports: true,
    exportBranding: true,
    advancedAnalytics: true,
    ssoEnabled: true,
    auditLog: true,
    prioritySupport: true,
    dedicatedCsm: true,
    customContracts: true,
    allowOverage: false,
    overage: null,
    trialDays: 14,
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function hasFeature(tier: PlanTier, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[tier];
  const val = limits[feature];
  return typeof val === "boolean" ? val : (val as number) !== 0;
}

// Ordered from lowest to highest for upgrade path calculations
export const PLAN_ORDER: PlanTier[] = [
  "FREE",
  "STARTER",
  "PRO",
  "AGENCY",
  "ENTERPRISE",
];

export function isUpgrade(from: PlanTier, to: PlanTier): boolean {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
}

export const PLAN_PRICES_USD: Partial<Record<PlanTier, { monthly: number; annual: number }>> = {
  FREE: { monthly: 0, annual: 0 },
  STARTER: { monthly: 49, annual: 39 },
  PRO: { monthly: 149, annual: 119 },
  AGENCY: { monthly: 399, annual: 319 },
};
