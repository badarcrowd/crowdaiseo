import "server-only";
import { AppError } from "@/lib/errors";
import { clientEnv } from "@/config/env";
import { checkQuota } from "./usage-service";
import { getPlanLimits, isUnlimited } from "../domain/plan-limits";
import { prisma } from "@/lib/prisma/client";
import type { PlanTier } from "@prisma/client";

type LimitableResource = "scans" | "promptRuns" | "reports" | "projects" | "seats";

// Throws a 402 PAYMENT_REQUIRED-equivalent AppError when the workspace
// is over quota. Call this before creating any metered resource.
export async function enforceLimit(
  workspaceId: string,
  resource: LimitableResource,
): Promise<void> {
  const { allowed, used, limit, planTier } = await checkQuota(workspaceId, resource);

  if (!allowed) {
    const upgradeUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/settings/billing?upgrade=1`;
    throw new AppError({
      code: "FORBIDDEN",
      message: `${resourceLabel(resource)} limit reached for your ${planTier} plan`,
      status: 402,
      expose: true,
      details: {
        resource,
        used,
        limit,
        planTier,
        upgradeUrl,
      },
    });
  }
}

// Check a feature flag — throws if the feature is not available on the plan
export async function enforceFeature(
  workspaceId: string,
  feature: "whiteLabel" | "apiAccess" | "scheduledReports" | "advancedAnalytics" | "ssoEnabled",
): Promise<void> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { planTier: true },
  });

  const limits = getPlanLimits(workspace.planTier as PlanTier);
  if (!limits[feature]) {
    const upgradeUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/settings/billing?upgrade=1`;
    throw new AppError({
      code: "FORBIDDEN",
      message: `${featureLabel(feature)} is not available on your ${workspace.planTier} plan`,
      status: 402,
      expose: true,
      details: {
        feature,
        planTier: workspace.planTier,
        upgradeUrl,
      },
    });
  }
}

// Enforces seat limit when inviting a new team member
export async function enforceSeatLimit(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { planTier: true },
  });

  const limits = getPlanLimits(workspace.planTier as PlanTier);
  if (isUnlimited(limits.seats)) return;

  const currentSeats = await prisma.workspaceMember.count({ where: { workspaceId } });
  if (currentSeats >= limits.seats) {
    const upgradeUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/settings/billing?upgrade=1`;
    throw new AppError({
      code: "FORBIDDEN",
      message: `Seat limit reached. Upgrade your plan to add more teammates.`,
      status: 402,
      expose: true,
      details: {
        resource: "seats",
        used: currentSeats,
        limit: limits.seats,
        planTier: workspace.planTier,
        upgradeUrl,
      },
    });
  }
}

function resourceLabel(r: LimitableResource): string {
  const labels: Record<LimitableResource, string> = {
    scans: "Scan",
    promptRuns: "Prompt run",
    reports: "Report",
    projects: "Project",
    seats: "Seat",
  };
  return labels[r];
}

function featureLabel(f: string): string {
  const labels: Record<string, string> = {
    whiteLabel: "White labeling",
    apiAccess: "API access",
    scheduledReports: "Scheduled reports",
    advancedAnalytics: "Advanced analytics",
    ssoEnabled: "Single sign-on",
  };
  return labels[f] ?? f;
}
