import "server-only";
import type { ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type { TrustContext } from "../domain/types";
import type { FreshnessInput } from "./freshness";
import type {
  AnomalyInput,
  CitationDomainSeries,
  CompetitorSovSeries,
  ProviderScoreSeries,
} from "./anomaly";
import type { EvidenceTraceInput } from "./evidence-trace";

const WINDOW_DAYS = 30;

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// -------------------------------------------------------------------------
// Trust Context — lightweight summary for confidence + freshness
// -------------------------------------------------------------------------

export const loadTrustContext = async (input: {
  projectId: string;
  workspaceId: string;
}): Promise<TrustContext> => {
  const { projectId } = input;
  const windowStart = daysAgo(WINDOW_DAYS);

  const [lastScan, snapshotStats, runStats] = await Promise.all([
    prisma.visibilityScan.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true, createdAt: true },
    }),

    prisma.visibilityScoreSnapshot.aggregate({
      where: { projectId, day: { gte: windowStart } },
      _count: { id: true },
      _max: { day: true },
    }),

    prisma.promptRun.groupBy({
      by: ["provider"],
      where: {
        scan: { projectId },
        status: { in: ["COMPLETED", "CACHED"] },
        createdAt: { gte: windowStart },
      },
      _count: { id: true },
    }),
  ]);

  const allProviders: ProviderId[] = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"];
  const providersWithRecentData = runStats
    .filter((r) => r._count.id >= 5)
    .map((r) => r.provider as ProviderId);

  const totalRunsLast30d = runStats.reduce((sum, r) => sum + r._count.id, 0);

  const lastScanAt = lastScan?.finishedAt ?? lastScan?.createdAt ?? null;
  const lastSnapshotAt = snapshotStats._max.day
    ? new Date(snapshotStats._max.day)
    : null;

  // Compute largest scan gap in the window
  const recentScans = await prisma.visibilityScan.findMany({
    where: { projectId, status: "COMPLETED", finishedAt: { gte: windowStart } },
    orderBy: { finishedAt: "asc" },
    select: { finishedAt: true },
  });

  let scanGapDays: number | null = null;
  for (let i = 1; i < recentScans.length; i++) {
    const gap =
      (recentScans[i]!.finishedAt!.getTime() - recentScans[i - 1]!.finishedAt!.getTime()) /
      86_400_000;
    if (scanGapDays === null || gap > scanGapDays) scanGapDays = gap;
  }

  return {
    projectId,
    lastScanAt: lastScanAt ? lastScanAt.toISOString() : null,
    lastSnapshotAt: lastSnapshotAt ? lastSnapshotAt.toISOString() : null,
    snapshotCount: snapshotStats._count.id,
    providersWithRecentData,
    allProviders,
    totalRunsLast30d,
    scanGapDays: scanGapDays !== null ? Math.round(scanGapDays) : null,
  };
};

// -------------------------------------------------------------------------
// Freshness Input — derived from TrustContext
// -------------------------------------------------------------------------

export const buildFreshnessInput = (ctx: TrustContext): FreshnessInput => ({
  lastScanAt: ctx.lastScanAt ? new Date(ctx.lastScanAt) : null,
  lastSnapshotAt: ctx.lastSnapshotAt ? new Date(ctx.lastSnapshotAt) : null,
  snapshotCount: ctx.snapshotCount,
  providersWithRecentData: ctx.providersWithRecentData,
  allProviders: ctx.allProviders,
  totalRunsLast30d: ctx.totalRunsLast30d,
  scanGapDays: ctx.scanGapDays,
});

// -------------------------------------------------------------------------
// Anomaly Input — time series for all detection dimensions
// -------------------------------------------------------------------------

export const loadAnomalyInput = async (input: {
  projectId: string;
}): Promise<AnomalyInput> => {
  const { projectId } = input;
  const windowStart = daysAgo(WINDOW_DAYS);

  const [snapshots, competitorMetrics, citationMetrics] = await Promise.all([
    prisma.visibilityScoreSnapshot.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: { day: true, byProvider: true, sentimentBonus: true },
    }),

    prisma.competitorDailyMetric.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: { day: true, entity: true, shareOfVoice: true },
    }),

    prisma.citationDailyMetric.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: { day: true, domain: true, count: true },
    }),
  ]);

  const completedScans = await prisma.visibilityScan.findMany({
    where: { projectId, status: "COMPLETED", finishedAt: { gte: windowStart } },
    orderBy: { finishedAt: "asc" },
    select: { finishedAt: true },
  });

  // Build per-provider score series from byProvider JSON
  const providerSeriesMap = new Map<string, Array<{ day: string; score: number }>>();
  for (const snap of snapshots) {
    const byProvider = snap.byProvider as Record<string, number>;
    const day = isoDay(snap.day);
    for (const [provider, score] of Object.entries(byProvider)) {
      const series = providerSeriesMap.get(provider) ?? [];
      series.push({ day, score });
      providerSeriesMap.set(provider, series);
    }
  }

  const providerScores: ProviderScoreSeries[] = Array.from(providerSeriesMap.entries()).map(
    ([provider, series]) => ({ provider: provider as ProviderId, series }),
  );

  // Competitor SOV series
  const competitorSeriesMap = new Map<string, Array<{ day: string; sov: number }>>();
  for (const m of competitorMetrics) {
    const series = competitorSeriesMap.get(m.entity) ?? [];
    series.push({ day: isoDay(m.day), sov: m.shareOfVoice });
    competitorSeriesMap.set(m.entity, series);
  }
  const competitorSov: CompetitorSovSeries[] = Array.from(competitorSeriesMap.entries()).map(
    ([entity, series]) => ({ entity, series }),
  );

  // Citation domain series
  const citationSeriesMap = new Map<string, Array<{ day: string; count: number }>>();
  for (const m of citationMetrics) {
    const series = citationSeriesMap.get(m.domain) ?? [];
    series.push({ day: isoDay(m.day), count: m.count });
    citationSeriesMap.set(m.domain, series);
  }
  const citationDomains: CitationDomainSeries[] = Array.from(citationSeriesMap.entries()).map(
    ([domain, series]) => ({ domain, series }),
  );

  // Sentiment series from sentimentBonus field on snapshots
  const sentiment = {
    series: snapshots.map((s) => ({
      day: isoDay(s.day),
      sentiment: s.sentimentBonus,
    })),
  };

  const scanTimeline = {
    scanDates: completedScans
      .filter((s): s is typeof s & { finishedAt: Date } => s.finishedAt !== null)
      .map((s) => isoDay(s.finishedAt)),
  };

  return { providerScores, competitorSov, citationDomains, sentiment, scanTimeline };
};

// -------------------------------------------------------------------------
// Evidence Trace Input — runs, citations, snapshots for a given scan/window
// -------------------------------------------------------------------------

export const loadEvidenceTraceInput = async (input: {
  projectId: string;
  scanId?: string;
  windowDays?: number;
}): Promise<EvidenceTraceInput> => {
  const { projectId, scanId, windowDays = WINDOW_DAYS } = input;
  const windowStart = daysAgo(windowDays);

  const baselineCutoffDate = daysAgo(Math.floor(windowDays / 2));
  const baselineCutoffDay = isoDay(baselineCutoffDate);

  const [runs, citations, snapshots] = await Promise.all([
    prisma.promptRun.findMany({
      where: scanId
        ? { scanId, status: { in: ["COMPLETED", "CACHED"] } }
        : {
            scan: { projectId },
            status: { in: ["COMPLETED", "CACHED"] },
            createdAt: { gte: windowStart },
          },
      select: {
        id: true,
        provider: true,
        brandMentioned: true,
        brandRank: true,
        promptId: true,
        prompt: { select: { category: true } },
        citations: { select: { domain: true } },
      },
      take: 500,
    }),

    prisma.citationDailyMetric.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { count: "desc" },
      take: 30,
      select: { domain: true, count: true, authorityScore: true, byProvider: true },
    }),

    prisma.visibilityScoreSnapshot.findMany({
      where: { projectId, day: { gte: windowStart } },
      orderBy: { day: "asc" },
      select: { day: true, total: true },
    }),
  ]);

  return {
    sourceType: "score",
    sourceId: scanId,
    runs: runs.map((r) => ({
      promptId: r.promptId,
      category: r.prompt.category,
      provider: r.provider,
      brandMentioned: r.brandMentioned,
      brandRank: r.brandRank,
      citationCount: r.citations.length,
      citationDomains: r.citations.map((c) => c.domain),
    })),
    citations: citations.map((c) => ({
      domain: c.domain,
      count: c.count,
      authorityScore: c.authorityScore,
      byProvider: c.byProvider as Record<ProviderId, number>,
    })),
    snapshots: snapshots.map((s) => ({
      day: isoDay(s.day),
      score: s.total,
    })),
    windowDays,
    baselineCutoffDay,
  };
};

// -------------------------------------------------------------------------
// Score Change Input — two-period comparison for explainability
// -------------------------------------------------------------------------

export const loadScoreChangeSummary = async (input: {
  projectId: string;
  windowDays?: number;
}) => {
  const { projectId, windowDays = 14 } = input;
  const windowStart = daysAgo(windowDays);
  const halfPoint = daysAgo(Math.floor(windowDays / 2));

  const snapshots = await prisma.visibilityScoreSnapshot.findMany({
    where: { projectId, day: { gte: windowStart } },
    orderBy: { day: "asc" },
    select: {
      day: true,
      total: true,
      citationRate: true,
      sentimentBonus: true,
      avgRank: true,
      sampleSize: true,
      byProvider: true,
    },
  });

  const prior = snapshots.filter((s) => s.day <= halfPoint);
  const current = snapshots.filter((s) => s.day > halfPoint);

  if (prior.length === 0 || current.length === 0) return null;

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length || 0;

  const priorTotal = avg(prior.map((s) => s.total));
  const currentTotal = avg(current.map((s) => s.total));

  const priorByProvider: Record<string, number> = {};
  const currentByProvider: Record<string, number> = {};

  for (const snap of prior) {
    const bp = snap.byProvider as Record<string, number>;
    for (const [p, v] of Object.entries(bp)) {
      priorByProvider[p] = (priorByProvider[p] ?? 0) + v;
    }
  }
  for (const [p] of Object.entries(priorByProvider)) {
    priorByProvider[p] = Math.round((priorByProvider[p] ?? 0) / prior.length);
  }

  for (const snap of current) {
    const bp = snap.byProvider as Record<string, number>;
    for (const [p, v] of Object.entries(bp)) {
      currentByProvider[p] = (currentByProvider[p] ?? 0) + v;
    }
  }
  for (const [p] of Object.entries(currentByProvider)) {
    currentByProvider[p] = Math.round((currentByProvider[p] ?? 0) / current.length);
  }

  const byProvider: Record<string, { current: number; previous: number }> = {};
  const allProviders = new Set([...Object.keys(priorByProvider), ...Object.keys(currentByProvider)]);
  for (const p of allProviders) {
    byProvider[p] = {
      current: currentByProvider[p] ?? 0,
      previous: priorByProvider[p] ?? 0,
    };
  }

  const priorRanks = prior.map((s) => s.avgRank).filter((r): r is number => r !== null);
  const currentRanks = current.map((s) => s.avgRank).filter((r): r is number => r !== null);

  return {
    current: Math.round(currentTotal),
    previous: Math.round(priorTotal),
    delta: Math.round(currentTotal - priorTotal),
    currentCitationRate: avg(current.map((s) => s.citationRate)),
    previousCitationRate: avg(prior.map((s) => s.citationRate)),
    currentSentiment: avg(current.map((s) => s.sentimentBonus)),
    previousSentiment: avg(prior.map((s) => s.sentimentBonus)),
    currentAvgRank: currentRanks.length ? avg(currentRanks) : null,
    previousAvgRank: priorRanks.length ? avg(priorRanks) : null,
    currentSampleSize: current.reduce((s, snap) => s + snap.sampleSize, 0),
    previousSampleSize: prior.reduce((s, snap) => s + snap.sampleSize, 0),
    windowDays,
    byProvider,
  };
};
