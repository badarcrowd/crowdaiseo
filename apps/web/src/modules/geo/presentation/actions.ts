"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { actionRateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit/log";
import { runGeoPipeline } from "../application/pipeline";
import { recommendationRepository } from "../infrastructure/recommendation.repository";

// ---------------------------------------------------------------------
// Re-run the GEO pipeline for a project.
// ---------------------------------------------------------------------

const rerunSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
});

export const rerunGeoPipelineAction = safeAction(rerunSchema, async (input) => {
  await actionRateLimit(input.workspaceId);
  const ctx = await requireRole(input.workspaceId, "EDITOR");
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { workspaceId: true },
  });
  if (!project || project.workspaceId !== input.workspaceId) {
    return { ok: false as const, error: "not-found" as const };
  }
  const result = await runGeoPipeline({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
  });
  await audit({
    workspaceId: input.workspaceId,
    actorId: ctx.user.id,
    action: "geo.pipeline.rerun",
    target: `project:${input.projectId}`,
    metadata: { written: result.written },
  });
  revalidatePath(`/app/w/${ctx.workspace.slug}/geo`);
  return { ok: true as const, ...result };
});

// ---------------------------------------------------------------------
// Update recommendation status (IN_PROGRESS, RESOLVED, DISMISSED).
// ---------------------------------------------------------------------

const updateStatusSchema = z.object({
  workspaceId: z.string().min(1),
  recommendationId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"]),
});

export const updateRecommendationStatusAction = safeAction(
  updateStatusSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const rec = await prisma.recommendation.findUnique({
      where: { id: input.recommendationId },
      select: { workspaceId: true, kind: true },
    });
    if (!rec || rec.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }
    await recommendationRepository.setStatus({
      recommendationId: input.recommendationId,
      status: input.status,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "geo.recommendation.status_updated",
      target: `recommendation:${input.recommendationId}`,
      metadata: { kind: rec.kind, status: input.status },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/geo`);
    return { ok: true as const };
  },
);
