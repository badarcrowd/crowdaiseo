import type { InsightKind, InsightSeverity } from "@prisma/client";
import { executiveInsightRepository } from "../infrastructure/executive-insight.repository";
import type { ExecutiveInsightMetadata } from "../domain/types";

/**
 * Read-side queries for the executive insight engine.
 * All methods scope by workspaceId and projectId.
 */
export const executiveInsightQueries = {
  /**
   * List executive insights for the dashboard.
   * Returns insights sorted by priority (embedded in metadata) desc.
   */
  async listInsights(input: {
    workspaceId: string;
    projectId: string;
    kinds?: InsightKind[];
    severity?: InsightSeverity;
    sinceDate?: Date;
    limit?: number;
  }) {
    const records = await executiveInsightRepository.listExecutiveInsights({
      ...input,
      limit: input.limit ?? 50,
    });

    return records
      .map((r) => {
        const meta = (r.metadata ?? {}) as ExecutiveInsightMetadata;
        return {
          id: r.id,
          kind: r.kind,
          severity: r.severity,
          title: r.title,
          body: r.body,
          confidence: r.confidence,
          forDay: r.forDay.toISOString().slice(0, 10),
          acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          metadata: meta,
          priority: (meta.priority as number | undefined) ?? 0,
          isNew: (meta.isNew as boolean | undefined) ?? false,
          evidence: meta.evidence ?? { items: [], windowDays: 0, dataPoints: 0 },
          affectedProviders: (meta.affectedProviders as string[] | undefined) ?? [],
          affectedCategories: (meta.affectedCategories as string[] | undefined) ?? [],
          recommendedAction: (meta.recommendedAction as string | undefined) ?? null,
        };
      })
      .sort((a, b) => b.priority - a.priority);
  },

  /**
   * Summary metrics for the executive dashboard header.
   */
  async getSummaryStats(workspaceId: string, projectId: string) {
    const [bySeverity, latestWeekly] = await Promise.all([
      executiveInsightRepository.countBySeverity(workspaceId, projectId),
      executiveInsightRepository.getLatestWeeklySummary(projectId),
    ]);

    return {
      criticalCount: bySeverity["CRITICAL"] ?? 0,
      attentionCount: bySeverity["ATTENTION"] ?? 0,
      infoCount: bySeverity["INFO"] ?? 0,
      latestWeeklySummary: latestWeekly
        ? {
            title: latestWeekly.title,
            body: latestWeekly.body,
            forDay: latestWeekly.forDay.toISOString().slice(0, 10),
            metadata: latestWeekly.metadata as ExecutiveInsightMetadata,
          }
        : null,
    };
  },

  /**
   * Strategic alerts only (CRITICAL + high-ATTENTION).
   * Used for the alert banner / notification feed.
   */
  async listAlerts(workspaceId: string, projectId: string, limit = 5) {
    return executiveInsightQueries.listInsights({
      workspaceId,
      projectId,
      kinds: ["STRATEGIC_ALERT", "COMPETITIVE_THREAT", "COMPETITOR_NEW_ENTRANT"],
      severity: "CRITICAL",
      sinceDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      limit,
    });
  },

  /**
   * Growth opportunities — positive signals for the opportunity feed.
   */
  async listOpportunities(workspaceId: string, projectId: string, limit = 10) {
    return executiveInsightQueries.listInsights({
      workspaceId,
      projectId,
      kinds: [
        "GROWTH_OPPORTUNITY",
        "PROVIDER_RECOMMENDATION",
        "CITATION_OPPORTUNITY",
        "CITATION_AUTHORITY_GAP",
        "AI_PERCEPTION_POSITIVE",
        "BRAND_TRUST_SIGNAL",
      ],
      sinceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      limit,
    });
  },
};
