import type { PlanTier, SubscriptionStatus, UsageEvent } from "@prisma/client";

// ---- Subscription -------------------------------------------------------

export type SubscriptionSummary = {
  workspaceId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  seats: number;
};

// ---- Trial ---------------------------------------------------------------

export type TrialStatus =
  | { active: true; daysRemaining: number; endsAt: Date; activationScore: number }
  | { active: false; expired: true; endsAt: Date }
  | { active: false; expired: false }; // never started or converted

// ---- Usage ---------------------------------------------------------------

export type UsageSummary = {
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
  scans: { used: number; limit: number };
  promptRuns: { used: number; limit: number };
  reports: { used: number; limit: number };
  projects: { used: number; limit: number };
  seats: { used: number; limit: number };
  aiTokens: { used: number; limit: number };
};

export type RecordUsageInput = {
  workspaceId: string;
  event: UsageEvent;
  resourceId?: string;
  resourceType?: string;
  quantity?: number;
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  actorId?: string;
  metadata?: Record<string, unknown>;
};

// ---- Checkout / Portal ---------------------------------------------------

export type CreateCheckoutInput = {
  workspaceId: string;
  userId: string;
  userEmail: string;
  planTier: PlanTier;
  billingInterval: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  url: string;
  sessionId: string;
};

export type CreatePortalInput = {
  workspaceId: string;
  returnUrl: string;
};

// ---- Onboarding ----------------------------------------------------------

export type OnboardingMilestone =
  | "projectCreated"
  | "firstScanCompleted"
  | "reportGenerated"
  | "teamMemberInvited"
  | "integrationConnected"
  | "billingAdded";

export const MILESTONE_WEIGHTS: Record<OnboardingMilestone, number> = {
  projectCreated: 25,
  firstScanCompleted: 30,
  reportGenerated: 15,
  teamMemberInvited: 15,
  integrationConnected: 10,
  billingAdded: 5,
};

export const ACTIVATION_THRESHOLD = 60;

// ---- Billing errors ------------------------------------------------------

export type LimitExceededPayload = {
  resource: string;
  used: number;
  limit: number;
  planTier: PlanTier;
  upgradeUrl: string;
};
