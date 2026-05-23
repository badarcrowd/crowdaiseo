import { prisma } from "@/lib/prisma/client";
import type { InsightKind, InsightSeverity } from "@prisma/client";
import type { RankedInsight } from "../domain/types";

/**
 * Persistence layer for executive insights.
 *
 * Reuses the existing `InsightRecord` table — executive insights are
 * differentiated by their `kind` values (EXECUTIVE_WEEKLY_SUMMARY,
 * COMPETITIVE_THREAT, etc.). The unique constraint
 * `(projectId, kind, forDay)` handles idempotent upserts.
 */
export const executiveInsightRepository = {
  async upsertInsights(input: {
    workspaceId: string;
    projectId: string;
    insights: RankedInsight[];
  }): Promise<void> {
    if (input.insights.length === 0) return;

    await prisma.$transaction(
      input.insights.map((insight) =>
        prisma.insightRecord.upsert({
          where: {
            projectId_kind_forDay: {
              projectId: input.projectId,
              kind: insight.kind,
              forDay: new Date(insight.forDay),
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            kind: insight.kind,
            severity: insight.severity,
            title: insight.title,
            body: insight.body,
            confidence: insight.confidence,
            metadata: {
              ...insight.metadata,
              priority: insight.priority,
              isNew: insight.isNew,
            } as never,
            forDay: new Date(insight.forDay),
          },
          update: {
            severity: insight.severity,
            title: insight.title,
            body: insight.body,
            confidence: insight.confidence,
            metadata: {
              ...insight.metadata,
              priority: insight.priority,
              isNew: insight.isNew,
            } as never,
          },
        }),
      ),
    );
  },

  async listExecutiveInsights(input: {
    workspaceId: string;
    projectId: string;
    kinds?: InsightKind[];
    sinceDate?: Date;
    severity?: InsightSeverity;
    limit?: number;
  }) {
    const EXECUTIVE_KINDS: InsightKind[] = [
      "EXECUTIVE_WEEKLY_SUMMARY",
      "COMPETITIVE_THREAT",
      "COMPETITOR_DOMINANCE",
      "AI_PERCEPTION_POSITIVE",
      "AI_PERCEPTION_NEGATIVE",
      "BRAND_TRUST_SIGNAL",
      "PROVIDER_RECOMMENDATION",
      "GROWTH_OPPORTUNITY",
      "STRATEGIC_ALERT",
      // Include these existing kinds in the executive view
      "COMPETITOR_NEW_ENTRANT",
      "CATEGORY_WEAK_SPOT",
      "SENTIMENT_SHIFT",
    ];

    return prisma.insightRecord.findMany({
      where: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        kind: { in: input.kinds ?? EXECUTIVE_KINDS },
        ...(input.sinceDate ? { forDay: { gte: input.sinceDate } } : {}),
        ...(input.severity ? { severity: input.severity } : {}),
      },
      orderBy: [{ forDay: "desc" }, { createdAt: "desc" }],
      take: input.limit ?? 50,
    });
  },

  async getLatestWeeklySummary(projectId: string) {
    return prisma.insightRecord.findFirst({
      where: { projectId, kind: "EXECUTIVE_WEEKLY_SUMMARY" },
      orderBy: { forDay: "desc" },
    });
  },

  async countBySeverity(workspaceId: string, projectId: string) {
    const rows = await prisma.insightRecord.groupBy({
      by: ["severity"],
      where: {
        workspaceId,
        projectId,
        forDay: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        kind: {
          in: [
            "EXECUTIVE_WEEKLY_SUMMARY",
            "COMPETITIVE_THREAT",
            "COMPETITOR_DOMINANCE",
            "AI_PERCEPTION_POSITIVE",
            "AI_PERCEPTION_NEGATIVE",
            "BRAND_TRUST_SIGNAL",
            "PROVIDER_RECOMMENDATION",
            "GROWTH_OPPORTUNITY",
            "STRATEGIC_ALERT",
            "COMPETITOR_NEW_ENTRANT",
            "CATEGORY_WEAK_SPOT",
            "SENTIMENT_SHIFT",
          ],
        },
      },
      _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.severity] = row._count.id;
    }
    return result;
  },
};
