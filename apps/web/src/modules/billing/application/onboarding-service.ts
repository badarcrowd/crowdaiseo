import "server-only";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import {
  MILESTONE_WEIGHTS,
  ACTIVATION_THRESHOLD,
  type OnboardingMilestone,
} from "../domain/types";

export async function completeMilestone(
  workspaceId: string,
  milestone: OnboardingMilestone,
): Promise<{ activationScore: number; justActivated: boolean }> {
  const current = await prisma.onboardingProgress.upsert({
    where: { workspaceId },
    create: { workspaceId, [milestone]: true },
    update: { [milestone]: true },
  });

  // Recalculate activation score from all completed milestones
  const score = Object.entries(MILESTONE_WEIGHTS).reduce((acc, [key, weight]) => {
    return acc + (current[key as keyof typeof current] ? weight : 0);
  }, 0);

  const justActivated = score >= ACTIVATION_THRESHOLD && !current.activatedAt;

  await prisma.onboardingProgress.update({
    where: { workspaceId },
    data: {
      activationScore: score,
      ...(justActivated ? { activatedAt: new Date() } : {}),
    },
  });

  if (justActivated) {
    logger.info({ workspaceId, score }, "workspace activated");
  }

  return { activationScore: score, justActivated };
}

export async function getOnboardingStatus(workspaceId: string) {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { workspaceId },
  });

  if (!progress) {
    return {
      milestones: Object.keys(MILESTONE_WEIGHTS).map((key) => ({
        key: key as OnboardingMilestone,
        completed: false,
        weight: MILESTONE_WEIGHTS[key as OnboardingMilestone],
      })),
      activationScore: 0,
      activated: false,
    };
  }

  return {
    milestones: Object.entries(MILESTONE_WEIGHTS).map(([key, weight]) => ({
      key: key as OnboardingMilestone,
      completed: Boolean(progress[key as keyof typeof progress]),
      weight,
    })),
    activationScore: progress.activationScore,
    activated: !!progress.activatedAt,
    activatedAt: progress.activatedAt,
  };
}
