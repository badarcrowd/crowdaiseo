import type { Prisma, RecommendationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type { PrioritizedRecommendation } from "../domain/types";

/**
 * Persistence for recommendations.
 *
 * Idempotent upserts on `(projectId, kind, targetKey)` mean a re-run
 * overwrites the row without resetting status/acknowledged metadata.
 * Rows that the latest run did NOT regenerate get marked STALE so the
 * UI can hide them — but their history stays for the audit trail.
 */

export const recommendationRepository = {
  async writeRecommendations(input: {
    workspaceId: string;
    projectId: string;
    day: Date;
    recommendations: PrioritizedRecommendation[];
  }) {
    assertServerRuntime();
    const dayOnly = toDayOnly(input.day);
    const writtenKeys = new Set<string>();

    await prisma.$transaction(async (tx) => {
      for (const rec of input.recommendations) {
        const key = `${rec.kind}::${rec.targetKey}`;
        writtenKeys.add(key);
        // Don't overwrite acknowledged/resolved status on re-run — the
        // user intentionally moved it out of OPEN.
        await tx.recommendation.upsert({
          where: {
            projectId_kind_targetKey: {
              projectId: input.projectId,
              kind: rec.kind,
              targetKey: rec.targetKey,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            category: rec.category,
            kind: rec.kind,
            targetKey: rec.targetKey,
            title: rec.title,
            description: rec.description,
            action: rec.action,
            confidence: rec.confidence,
            impactScore: rec.impactScore,
            difficulty: rec.difficulty,
            priorityScore: rec.priorityScore,
            evidence: rec.evidence as Prisma.InputJsonValue,
            metadata: (rec.metadata ?? {}) as Prisma.InputJsonValue,
            generatedFor: dayOnly,
          },
          update: {
            title: rec.title,
            description: rec.description,
            action: rec.action,
            confidence: rec.confidence,
            impactScore: rec.impactScore,
            difficulty: rec.difficulty,
            priorityScore: rec.priorityScore,
            evidence: rec.evidence as Prisma.InputJsonValue,
            metadata: (rec.metadata ?? {}) as Prisma.InputJsonValue,
            generatedFor: dayOnly,
            // If the recommendation was previously RESOLVED/STALE but
            // the condition has resurfaced, reopen it.
            status: { set: "OPEN" as RecommendationStatus },
          },
        });
      }

      // Mark rows we no longer generate as STALE — preserves history
      // without polluting the active list.
      const existing = await tx.recommendation.findMany({
        where: {
          projectId: input.projectId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
        select: { id: true, kind: true, targetKey: true },
      });
      const staleIds = existing
        .filter((e) => !writtenKeys.has(`${e.kind}::${e.targetKey}`))
        .map((e) => e.id);
      if (staleIds.length > 0) {
        await tx.recommendation.updateMany({
          where: { id: { in: staleIds } },
          data: { status: "STALE", resolvedAt: new Date() },
        });
      }
    });
  },

  async listOpenRecommendations(input: {
    projectId: string;
    category?: Prisma.EnumRecommendationCategoryFilter | undefined;
    limit?: number;
  }) {
    assertServerRuntime();
    return prisma.recommendation.findMany({
      where: {
        projectId: input.projectId,
        category: input.category,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: input.limit ?? 50,
    });
  },

  async setStatus(input: {
    recommendationId: string;
    status: RecommendationStatus;
  }) {
    assertServerRuntime();
    return prisma.recommendation.update({
      where: { id: input.recommendationId },
      data: {
        status: input.status,
        acknowledgedAt:
          input.status === "IN_PROGRESS" ? new Date() : undefined,
        resolvedAt:
          input.status === "RESOLVED" || input.status === "DISMISSED"
            ? new Date()
            : undefined,
      },
    });
  },
};

const toDayOnly = (d: Date): Date => {
  const day = new Date(d);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("recommendationRepository must run on the server");
  }
}
