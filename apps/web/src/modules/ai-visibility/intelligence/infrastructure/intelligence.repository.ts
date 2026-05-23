import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type {
  CitationAggregate,
  CompetitorAggregate,
  GeneratedInsight,
  IntelligenceScore,
  VolatilityMetric,
} from "../domain/types";

/**
 * Persistence layer for the intelligence pipeline.
 *
 * All writes are idempotent on `(projectId, day, ...)` so re-running
 * the pipeline (e.g. after fixing a bad scan) overwrites instead of
 * duplicating. Insight records also dedupe on `(kind, forDay)` — the
 * uniqueness constraint is the source of truth, not the application.
 */

export const intelligenceRepository = {
  // ---- Config ----
  async getScoringConfig(workspaceId: string) {
    return prisma.scoringConfig.findUnique({ where: { workspaceId } });
  },

  async upsertScoringConfig(
    workspaceId: string,
    data: Partial<{
      weightCitationRate: number;
      weightRankBonus: number;
      weightSentimentBonus: number;
      weightCitationDensity: number;
      providerWeights: Prisma.InputJsonValue;
      minRunsForConfidence: number;
      sentimentAdjusted: boolean;
      authorityWeighted: boolean;
      updatedById: string | null;
    }>,
  ) {
    return prisma.scoringConfig.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    });
  },

  // ---- Score snapshots ----
  async upsertScoreSnapshot(input: {
    workspaceId: string;
    projectId: string;
    day: Date;
    scanId: string | null;
    score: IntelligenceScore;
  }) {
    const dayOnly = toDayOnly(input.day);
    return prisma.visibilityScoreSnapshot.upsert({
      where: { projectId_day: { projectId: input.projectId, day: dayOnly } },
      create: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        day: dayOnly,
        scanId: input.scanId,
        total: input.score.total,
        byProvider: input.score.byProvider as Prisma.InputJsonValue,
        citationRate: input.score.breakdown.citationRate,
        avgRank: input.score.breakdown.avgRank ?? null,
        sentimentBonus: input.score.breakdown.sentimentBonus,
        citationCount: input.score.breakdown.citationCount,
        confidence: input.score.confidence,
        sampleSize: input.score.sampleSize,
        weightsUsed: input.score.weightsUsed as unknown as Prisma.InputJsonValue,
      },
      update: {
        scanId: input.scanId,
        total: input.score.total,
        byProvider: input.score.byProvider as Prisma.InputJsonValue,
        citationRate: input.score.breakdown.citationRate,
        avgRank: input.score.breakdown.avgRank ?? null,
        sentimentBonus: input.score.breakdown.sentimentBonus,
        citationCount: input.score.breakdown.citationCount,
        confidence: input.score.confidence,
        sampleSize: input.score.sampleSize,
        weightsUsed: input.score.weightsUsed as unknown as Prisma.InputJsonValue,
      },
    });
  },

  async listScoreSnapshots(projectId: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    return prisma.visibilityScoreSnapshot.findMany({
      where: { projectId, day: { gte: since } },
      orderBy: { day: "asc" },
    });
  },

  // ---- Competitor metrics ----
  async upsertCompetitorMetrics(input: {
    workspaceId: string;
    projectId: string;
    day: Date;
    aggregates: CompetitorAggregate[];
  }) {
    const dayOnly = toDayOnly(input.day);
    // Use transaction so partial writes don't leave stale rows.
    await prisma.$transaction(async (tx) => {
      for (const a of input.aggregates) {
        await tx.competitorDailyMetric.upsert({
          where: {
            projectId_day_entity: {
              projectId: input.projectId,
              day: dayOnly,
              entity: a.entity,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            day: dayOnly,
            entity: a.entity,
            mentions: a.mentions,
            appearedInRuns: a.appearedInRuns,
            totalRuns: a.totalRuns,
            avgRank: a.avgRank,
            byProvider: a.byProvider as unknown as Prisma.InputJsonValue,
            byCategory: a.byCategory as unknown as Prisma.InputJsonValue,
            shareOfVoice: a.shareOfVoice,
          },
          update: {
            mentions: a.mentions,
            appearedInRuns: a.appearedInRuns,
            totalRuns: a.totalRuns,
            avgRank: a.avgRank,
            byProvider: a.byProvider as unknown as Prisma.InputJsonValue,
            byCategory: a.byCategory as unknown as Prisma.InputJsonValue,
            shareOfVoice: a.shareOfVoice,
          },
        });
      }
    });
  },

  // ---- Citation metrics ----
  async upsertCitationMetrics(input: {
    workspaceId: string;
    projectId: string;
    day: Date;
    aggregates: CitationAggregate[];
  }) {
    const dayOnly = toDayOnly(input.day);
    await prisma.$transaction(async (tx) => {
      for (const a of input.aggregates) {
        await tx.citationDailyMetric.upsert({
          where: {
            projectId_day_domain: {
              projectId: input.projectId,
              day: dayOnly,
              domain: a.domain,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            day: dayOnly,
            domain: a.domain,
            count: a.count,
            appearedInRuns: a.appearedInRuns,
            totalRuns: a.totalRuns,
            authorityScore: a.authorityScore,
            byProvider: a.byProvider as unknown as Prisma.InputJsonValue,
            avgRank: a.avgRank,
          },
          update: {
            count: a.count,
            appearedInRuns: a.appearedInRuns,
            totalRuns: a.totalRuns,
            authorityScore: a.authorityScore,
            byProvider: a.byProvider as unknown as Prisma.InputJsonValue,
            avgRank: a.avgRank,
          },
        });
      }
    });
  },

  // ---- Volatility ----
  async upsertVolatility(input: {
    workspaceId: string;
    projectId: string;
    day: Date;
    metrics: VolatilityMetric[];
  }) {
    const dayOnly = toDayOnly(input.day);
    await prisma.$transaction(async (tx) => {
      for (const v of input.metrics) {
        await tx.providerVolatilityMetric.upsert({
          where: {
            projectId_day_provider: {
              projectId: input.projectId,
              day: dayOnly,
              provider: v.provider,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            day: dayOnly,
            provider: v.provider,
            volatility: v.volatility,
            rankStability: v.rankStability,
            sampleSize: v.sampleSize,
          },
          update: {
            volatility: v.volatility,
            rankStability: v.rankStability,
            sampleSize: v.sampleSize,
          },
        });
      }
    });
  },

  // ---- Insights ----
  async upsertInsights(input: {
    workspaceId: string;
    projectId: string;
    insights: GeneratedInsight[];
  }) {
    if (input.insights.length === 0) return;
    await prisma.$transaction(async (tx) => {
      for (const i of input.insights) {
        const dayOnly = toDayOnly(new Date(i.forDay));
        await tx.insightRecord.upsert({
          where: {
            projectId_kind_forDay: {
              projectId: input.projectId,
              kind: i.kind,
              forDay: dayOnly,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            kind: i.kind,
            severity: i.severity,
            title: i.title,
            body: i.body,
            confidence: i.confidence,
            metadata: i.metadata as Prisma.InputJsonValue,
            forDay: dayOnly,
          },
          update: {
            severity: i.severity,
            title: i.title,
            body: i.body,
            confidence: i.confidence,
            metadata: i.metadata as Prisma.InputJsonValue,
          },
        });
      }
    });
  },

  async listInsights(projectId: string, limit = 50) {
    return prisma.insightRecord.findMany({
      where: { projectId, acknowledgedAt: null },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  },

  async acknowledgeInsight(insightId: string) {
    return prisma.insightRecord.update({
      where: { id: insightId },
      data: { acknowledgedAt: new Date() },
    });
  },
};

// UTC day-only boundary so DATE columns dedupe correctly.
const toDayOnly = (d: Date): Date => {
  const day = new Date(d);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};
