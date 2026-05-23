import "server-only";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { getPlanLimits, isUnlimited } from "../domain/plan-limits";
import type { RecordUsageInput, UsageSummary } from "../domain/types";
import type { PlanTier, UsageEvent } from "@prisma/client";

// Maps a UsageEvent to the quota counter it increments
const EVENT_QUOTA_MAP: Partial<Record<UsageEvent, keyof QuotaCounters>> = {
  SCAN_COMPLETED: "scansUsed",
  PROMPT_RUN_COMPLETED: "promptRunsUsed",
  REPORT_GENERATED: "reportsUsed",
  AI_TOKEN_CONSUMED: "aiTokensUsed",
};

type QuotaCounters = {
  scansUsed: number;
  promptRunsUsed: number;
  reportsUsed: number;
  aiTokensUsed: number;
};

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const {
    workspaceId,
    event,
    resourceId,
    resourceType,
    quantity = 1,
    provider,
    model,
    promptTokens,
    completionTokens,
    costUsd,
    actorId,
    metadata,
  } = input;

  // Write append-only usage record
  await prisma.usageRecord.create({
    data: {
      workspaceId,
      event,
      resourceId,
      resourceType,
      quantity,
      provider,
      model,
      promptTokens,
      completionTokens,
      costUsd: costUsd != null ? costUsd : undefined,
      actorId,
      metadata: metadata as never,
      periodStart: await getCurrentPeriodStart(workspaceId),
    },
  });

  // Increment rolling quota counter
  const quotaField = EVENT_QUOTA_MAP[event];
  if (quotaField) {
    const tokenIncrement = event === "AI_TOKEN_CONSUMED"
      ? (promptTokens ?? 0) + (completionTokens ?? 0)
      : quantity;

    await prisma.workspaceUsageQuota.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        [quotaField]: tokenIncrement,
        aiCostUsd: costUsd ?? 0,
      },
      update: {
        [quotaField]: { increment: tokenIncrement },
        aiCostUsd: costUsd != null
          ? { increment: costUsd }
          : undefined,
      },
    });
  }

  logger.debug({ workspaceId, event, quantity }, "usage recorded");
}

export async function getUsageSummary(
  workspaceId: string,
): Promise<UsageSummary> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      planTier: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      usageQuota: true,
      _count: { select: { projects: true, members: true } },
    },
  });

  const limits = getPlanLimits(workspace.planTier as PlanTier);
  const quota = workspace.usageQuota;
  const periodStart = workspace.currentPeriodStart ?? new Date();
  const periodEnd = workspace.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    workspaceId,
    periodStart,
    periodEnd,
    scans: { used: quota?.scansUsed ?? 0, limit: limits.scansPerMonth },
    promptRuns: { used: quota?.promptRunsUsed ?? 0, limit: limits.promptRunsPerMonth },
    reports: { used: quota?.reportsUsed ?? 0, limit: limits.reportsPerMonth },
    projects: { used: workspace._count.projects, limit: limits.projects },
    seats: { used: workspace._count.members, limit: limits.seats },
    aiTokens: { used: quota?.aiTokensUsed ?? 0, limit: -1 },
  };
}

// Returns true when the workspace is within limits for the given resource
export async function checkQuota(
  workspaceId: string,
  resource: "scans" | "promptRuns" | "reports" | "projects" | "seats",
): Promise<{ allowed: boolean; used: number; limit: number; planTier: PlanTier }> {
  const summary = await getUsageSummary(workspaceId);
  const metric = summary[resource];
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { planTier: true },
  });

  const allowed = isUnlimited(metric.limit) || metric.used < metric.limit;
  return {
    allowed,
    used: metric.used,
    limit: metric.limit,
    planTier: workspace.planTier as PlanTier,
  };
}

export async function syncProjectCount(workspaceId: string): Promise<void> {
  const count = await prisma.project.count({
    where: { workspaceId, deletedAt: null },
  });
  await prisma.workspaceUsageQuota.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      projectsActive: count,
    },
    update: { projectsActive: count },
  });
}

export async function syncSeatCount(workspaceId: string): Promise<void> {
  const count = await prisma.workspaceMember.count({ where: { workspaceId } });
  await prisma.workspaceUsageQuota.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      seatsUsed: count,
    },
    update: { seatsUsed: count },
  });
}

// Reset usage counters when a new billing period starts
export async function resetPeriodQuota(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<void> {
  await prisma.workspaceUsageQuota.upsert({
    where: { workspaceId },
    create: { workspaceId, periodStart, periodEnd },
    update: {
      periodStart,
      periodEnd,
      scansUsed: 0,
      promptRunsUsed: 0,
      reportsUsed: 0,
      aiTokensUsed: 0,
      aiCostUsd: 0,
    },
  });
  logger.info({ workspaceId, periodStart, periodEnd }, "usage quota reset for new period");
}

async function getCurrentPeriodStart(workspaceId: string): Promise<Date | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { currentPeriodStart: true },
  });
  return ws?.currentPeriodStart ?? null;
}
