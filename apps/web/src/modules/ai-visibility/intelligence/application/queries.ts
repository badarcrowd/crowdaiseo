import { prisma } from "@/lib/prisma/client";
import type { InsightSeverity, ProviderId } from "@prisma/client";
import { intelligenceRepository } from "../infrastructure/intelligence.repository";

/**
 * Read-side: dashboards consume these. All reads hit pre-materialized
 * snapshot / metric tables, so a 90-day view costs O(90) row scans
 * instead of aggregating thousands of prompt runs at request time.
 */

export const intelligenceQueries = {
  async getProjectScoreTrend(projectId: string, days: number) {
    const snapshots = await intelligenceRepository.listScoreSnapshots(
      projectId,
      days,
    );
    return snapshots.map((s: (typeof snapshots)[number]) => ({
      day: s.day.toISOString().slice(0, 10),
      total: s.total,
      byProvider: s.byProvider as Record<ProviderId, number>,
      confidence: s.confidence,
      sampleSize: s.sampleSize,
    }));
  },

  async getLatestSnapshot(projectId: string) {
    return prisma.visibilityScoreSnapshot.findFirst({
      where: { projectId },
      orderBy: { day: "desc" },
    });
  },

  async getCompetitorTrend(projectId: string, entity: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    return prisma.competitorDailyMetric.findMany({
      where: { projectId, entity, day: { gte: since } },
      orderBy: { day: "asc" },
    });
  },

  async getTopCompetitors(projectId: string, days: number, limit = 10) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await prisma.competitorDailyMetric.findMany({
      where: { projectId, day: { gte: since } },
      orderBy: { day: "desc" },
    });
    // Aggregate by entity across the window.
    const agg = new Map<
      string,
      { entity: string; mentions: number; share: number; days: number }
    >();
    for (const r of rows) {
      const a = agg.get(r.entity) ?? {
        entity: r.entity,
        mentions: 0,
        share: 0,
        days: 0,
      };
      a.mentions += r.mentions;
      a.share += r.shareOfVoice;
      a.days += 1;
      agg.set(r.entity, a);
    }
    return [...agg.values()]
      .map((a) => ({
        entity: a.entity,
        mentions: a.mentions,
        avgShareOfVoice: a.days > 0 ? a.share / a.days : 0,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, limit);
  },

  async getTopCitations(projectId: string, days: number, limit = 15) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await prisma.citationDailyMetric.findMany({
      where: { projectId, day: { gte: since } },
      orderBy: { day: "desc" },
    });
    const agg = new Map<
      string,
      {
        domain: string;
        count: number;
        authorityScore: number;
        appearedInRuns: number;
      }
    >();
    for (const r of rows) {
      const a = agg.get(r.domain) ?? {
        domain: r.domain,
        count: 0,
        authorityScore: r.authorityScore,
        appearedInRuns: 0,
      };
      a.count += r.count;
      a.appearedInRuns += r.appearedInRuns;
      agg.set(r.domain, a);
    }
    return [...agg.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  async listInsights(input: {
    projectId: string;
    severity?: InsightSeverity;
    limit?: number;
  }) {
    return prisma.insightRecord.findMany({
      where: {
        projectId: input.projectId,
        severity: input.severity,
        acknowledgedAt: null,
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: input.limit ?? 50,
    });
  },

  async getProviderVolatility(projectId: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    return prisma.providerVolatilityMetric.findMany({
      where: { projectId, day: { gte: since } },
      orderBy: { day: "asc" },
    });
  },
};
