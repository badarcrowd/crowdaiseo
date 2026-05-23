import "server-only";
import type { RecommendationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

/**
 * Read-side for the GEO dashboard.
 *
 * Reads pre-materialized recommendations directly — no aggregation at
 * request time. UI data models match the persisted shape.
 */

export type RecommendationListItem = Awaited<
  ReturnType<typeof geoQueries.listRecommendations>
>[number];

export const geoQueries = {
  async listRecommendations(input: {
    projectId: string;
    category?: RecommendationCategory;
    limit?: number;
  }) {
    return prisma.recommendation.findMany({
      where: {
        projectId: input.projectId,
        category: input.category,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: input.limit ?? 100,
      select: {
        id: true,
        category: true,
        kind: true,
        targetKey: true,
        title: true,
        description: true,
        action: true,
        confidence: true,
        impactScore: true,
        difficulty: true,
        priorityScore: true,
        status: true,
        evidence: true,
        metadata: true,
        acknowledgedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Summary counts for the dashboard header — total open / in-progress
   * recommendations per category, with the highest-priority score.
   */
  async getSummary(projectId: string) {
    const rows = await prisma.recommendation.findMany({
      where: {
        projectId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: { category: true, priorityScore: true, status: true },
    });
    const summary = new Map<
      RecommendationCategory,
      { open: number; inProgress: number; topPriority: number }
    >();
    for (const r of rows) {
      const slot = summary.get(r.category) ?? {
        open: 0,
        inProgress: 0,
        topPriority: 0,
      };
      if (r.status === "OPEN") slot.open++;
      if (r.status === "IN_PROGRESS") slot.inProgress++;
      if (r.priorityScore > slot.topPriority) slot.topPriority = r.priorityScore;
      summary.set(r.category, slot);
    }
    return summary;
  },

  async getRecentlyResolved(projectId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    return prisma.recommendation.findMany({
      where: {
        projectId,
        status: "RESOLVED",
        resolvedAt: { gte: since },
      },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    });
  },
};
