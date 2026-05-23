"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { actionRateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit/log";
import {
  intelligenceRepository,
  runIntelligencePipeline,
} from "../intelligence";

const providerEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"]);

// ---------------------------------------------------------------------
// Scoring config — owners/admins tune the weights used by the engine.
// ---------------------------------------------------------------------

const updateScoringConfigSchema = z.object({
  workspaceId: z.string().min(1),
  weightCitationRate: z.number().min(0).max(100).optional(),
  weightRankBonus: z.number().min(0).max(50).optional(),
  weightSentimentBonus: z.number().min(0).max(50).optional(),
  weightCitationDensity: z.number().min(0).max(50).optional(),
  providerWeights: z
    .record(providerEnum, z.number().min(0).max(3))
    .optional(),
  minRunsForConfidence: z.number().int().min(1).max(500).optional(),
  sentimentAdjusted: z.boolean().optional(),
  authorityWeighted: z.boolean().optional(),
});

export const updateScoringConfigAction = safeAction(
  updateScoringConfigSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const { workspaceId, providerWeights, ...rest } = input;
    await intelligenceRepository.upsertScoringConfig(workspaceId, {
      ...rest,
      providerWeights: providerWeights ?? undefined,
      updatedById: ctx.user.id,
    });
    await audit({
      workspaceId,
      actorId: ctx.user.id,
      action: "intelligence.scoring_config.updated",
      metadata: { changes: input },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { ok: true as const };
  },
);

// ---------------------------------------------------------------------
// Insight acknowledgement — hides an insight from the active feed.
// ---------------------------------------------------------------------

const acknowledgeInsightSchema = z.object({
  workspaceId: z.string().min(1),
  insightId: z.string().min(1),
});

export const acknowledgeInsightAction = safeAction(
  acknowledgeInsightSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const insight = await prisma.insightRecord.findUnique({
      where: { id: input.insightId },
      select: { workspaceId: true, projectId: true, kind: true },
    });
    if (!insight || insight.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }
    await intelligenceRepository.acknowledgeInsight(input.insightId);
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "intelligence.insight.acknowledged",
      target: `insight:${input.insightId}`,
      metadata: { kind: insight.kind },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { ok: true as const };
  },
);

// ---------------------------------------------------------------------
// Re-run pipeline — useful after editing weights or fixing bad data.
// ---------------------------------------------------------------------

const rerunPipelineSchema = z.object({
  workspaceId: z.string().min(1),
  scanId: z.string().min(1),
});

export const rerunIntelligencePipelineAction = safeAction(
  rerunPipelineSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const scan = await prisma.visibilityScan.findUnique({
      where: { id: input.scanId },
      select: { workspaceId: true, projectId: true },
    });
    if (!scan || scan.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }
    await runIntelligencePipeline({
      workspaceId: scan.workspaceId,
      projectId: scan.projectId,
      scanId: input.scanId,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "intelligence.pipeline.rerun",
      target: `scan:${input.scanId}`,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { ok: true as const };
  },
);
