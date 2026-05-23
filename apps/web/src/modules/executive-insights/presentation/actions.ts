"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { actionRateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit/log";
import { prisma } from "@/lib/prisma/client";
import { runExecutiveInsightPipeline } from "../application/pipeline";

// -------------------------------------------------------------------------
// Re-run executive insight pipeline on demand
// -------------------------------------------------------------------------

const rerunSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
});

export const rerunExecutiveInsightPipelineAction = safeAction(
  rerunSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (!project || project.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }

    const result = await runExecutiveInsightPipeline({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    });

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "executive.insight.pipeline.rerun",
      target: `project:${input.projectId}`,
      metadata: { insightsGenerated: result.insightsGenerated },
    });

    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { ok: true as const, ...result };
  },
);

// -------------------------------------------------------------------------
// Acknowledge an insight (dismiss from active feed)
// -------------------------------------------------------------------------

const acknowledgeSchema = z.object({
  workspaceId: z.string().min(1),
  insightId: z.string().min(1),
});

export const acknowledgeInsightAction = safeAction(
  acknowledgeSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "VIEWER");

    const insight = await prisma.insightRecord.findUnique({
      where: { id: input.insightId },
      select: { workspaceId: true, kind: true },
    });
    if (!insight || insight.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }

    await prisma.insightRecord.update({
      where: { id: input.insightId },
      data: { acknowledgedAt: new Date() },
    });

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "executive.insight.acknowledged",
      target: `insight:${input.insightId}`,
      metadata: { kind: insight.kind },
    });

    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { ok: true as const };
  },
);
