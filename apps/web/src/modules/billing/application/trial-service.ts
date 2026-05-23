import "server-only";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import type { TrialStatus } from "../domain/types";

const TRIAL_DAYS = 7;

export async function createTrial(workspaceId: string): Promise<void> {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      trialEndsAt,
      trialActivatedAt: new Date(),
      subscriptionStatus: "TRIALING",
    },
  });

  // Seed onboarding progress row
  await prisma.onboardingProgress.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });

  logger.info({ workspaceId, trialEndsAt }, "trial started");
}

export async function getTrialStatus(workspaceId: string): Promise<TrialStatus> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      trialEndsAt: true,
      trialActivatedAt: true,
      subscriptionStatus: true,
      onboarding: { select: { activationScore: true } },
    },
  });

  if (!workspace.trialEndsAt) {
    return { active: false, expired: false };
  }

  const now = new Date();
  const endsAt = workspace.trialEndsAt;
  const activationScore = workspace.onboarding?.activationScore ?? 0;

  if (endsAt > now && workspace.subscriptionStatus === "TRIALING") {
    const msRemaining = endsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    return { active: true, daysRemaining, endsAt, activationScore };
  }

  return { active: false, expired: true, endsAt };
}

export async function isTrialActive(workspaceId: string): Promise<boolean> {
  const status = await getTrialStatus(workspaceId);
  return status.active;
}

// Called on workspace creation to auto-start the trial
export async function initializeWorkspaceBilling(
  workspaceId: string,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string,
  referralCode?: string,
): Promise<void> {
  await createTrial(workspaceId);

  await prisma.onboardingProgress.upsert({
    where: { workspaceId },
    create: { workspaceId, utmSource, utmMedium, utmCampaign, referralCode },
    update: {},
  });

  await prisma.workspaceUsageQuota.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });
}
