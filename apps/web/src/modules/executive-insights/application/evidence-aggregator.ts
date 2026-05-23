import type { InsightKind, PromptCategory, ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type {
  CitationDayMetric,
  CompetitorDayMetric,
  ExecutiveContext,
  GeoRecSummary,
  LatestRun,
  ScoreSnapshot,
} from "../domain/types";

const SNAPSHOT_WINDOW_DAYS = 30;
const NOVELTY_WINDOW_DAYS = 14;

/**
 * Single-pass evidence aggregator.
 *
 * Loads all data needed by every executive insight generator in one
 * parallel batch. Callers receive a fully-hydrated `ExecutiveContext`
 * and do not touch the database themselves.
 */
export const aggregateEvidence = async (input: {
  workspaceId: string;
  projectId: string;
}): Promise<ExecutiveContext> => {
  const { workspaceId, projectId } = input;

  const windowStart = daysAgo(SNAPSHOT_WINDOW_DAYS);
  const noveltyStart = daysAgo(NOVELTY_WINDOW_DAYS);
  const todayIso = isoDay(new Date());

  const [
    project,
    rawSnapshots,
    rawCompetitors,
    rawCitations,
    latestScan,
    rawGeoRecs,
    rawRecentInsights,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true },
    }),

    // Score snapshots — 30d window
    prisma.visibilityScoreSnapshot.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        total: true,
        byProvider: true,
        citationRate: true,
        avgRank: true,
        sentimentBonus: true,
        confidence: true,
        sampleSize: true,
      },
    }),

    // Competitor daily metrics — 30d window
    prisma.competitorDailyMetric.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        entity: true,
        mentions: true,
        appearedInRuns: true,
        totalRuns: true,
        shareOfVoice: true,
        avgRank: true,
        byProvider: true,
        byCategory: true,
      },
    }),

    // Citation daily metrics — 30d window
    prisma.citationDailyMetric.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        domain: true,
        count: true,
        authorityScore: true,
        byProvider: true,
        avgRank: true,
      },
    }),

    // Most recent completed scan (for its runs)
    prisma.visibilityScan.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),

    // Top open GEO recommendations
    prisma.recommendation.findMany({
      where: { projectId, status: "OPEN" },
      orderBy: { priorityScore: "desc" },
      take: 10,
      select: {
        kind: true,
        category: true,
        title: true,
        priorityScore: true,
        impactScore: true,
      },
    }),

    // Recent insight kinds for novelty detection
    prisma.insightRecord.findMany({
      where: { projectId, createdAt: { gte: noveltyStart } },
      select: { kind: true },
    }),
  ]);

  // Fetch latest runs only if we found a scan
  const latestRuns: LatestRun[] = [];
  if (latestScan) {
    const rawRuns = await prisma.promptRun.findMany({
      where: { scanId: latestScan.id, status: { in: ["COMPLETED", "CACHED"] } },
      select: {
        provider: true,
        brandMentioned: true,
        brandRank: true,
        sentimentScore: true,
        citations: { select: { domain: true } },
        prompt: { select: { category: true } },
      },
    });
    for (const r of rawRuns) {
      latestRuns.push({
        provider: r.provider,
        category: r.prompt.category as PromptCategory,
        brandMentioned: r.brandMentioned,
        brandRank: r.brandRank,
        sentimentScore: r.sentimentScore,
        citationCount: r.citations.length,
      });
    }
  }

  const snapshots: ScoreSnapshot[] = rawSnapshots.map((s) => ({
    day: isoDay(s.day),
    total: s.total,
    byProvider: s.byProvider as Record<string, number>,
    citationRate: s.citationRate,
    avgRank: s.avgRank,
    sentimentBonus: s.sentimentBonus,
    confidence: s.confidence,
    sampleSize: s.sampleSize,
  }));

  const competitorMetrics: CompetitorDayMetric[] = rawCompetitors.map((c) => ({
    day: isoDay(c.day),
    entity: c.entity,
    mentions: c.mentions,
    appearedInRuns: c.appearedInRuns,
    totalRuns: c.totalRuns,
    shareOfVoice: c.shareOfVoice,
    avgRank: c.avgRank,
    byProvider: c.byProvider as Record<string, number>,
    byCategory: c.byCategory as Record<string, number>,
  }));

  const citationMetrics: CitationDayMetric[] = rawCitations.map((c) => ({
    day: isoDay(c.day),
    domain: c.domain,
    count: c.count,
    authorityScore: c.authorityScore,
    byProvider: c.byProvider as Record<string, number>,
    avgRank: c.avgRank,
  }));

  const topGeoRecs: GeoRecSummary[] = rawGeoRecs.map((r) => ({
    kind: r.kind,
    category: r.category,
    title: r.title,
    priorityScore: r.priorityScore,
    impactScore: r.impactScore,
  }));

  const recentKinds = new Set<InsightKind>(
    rawRecentInsights.map((i) => i.kind),
  );

  return {
    workspaceId,
    projectId,
    projectDomain: project?.domain ?? "",
    todayIso,
    snapshots,
    competitorMetrics,
    citationMetrics,
    latestRuns,
    topGeoRecs,
    recentKinds,
  };
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
