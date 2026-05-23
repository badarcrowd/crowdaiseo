import type { ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { PROVIDER_LABEL } from "../../presentation/labels";
import { domainAuthority } from "../domain/authority";
import type {
  IntelligenceRunSample,
  ScoringOptions,
  ScoringWeights,
} from "../domain/types";
import { intelligenceRepository } from "../infrastructure/intelligence.repository";
import {
  computeIntelligenceScore,
  DEFAULT_OPTIONS,
  DEFAULT_WEIGHTS,
} from "./scoring";
import { analyzeCompetitors } from "./competitors";
import { analyzeCitations } from "./citations";
import { computeProviderVolatility, summarizeTrend } from "./trends";
import { generateInsights, type InsightContext } from "./insights";

/**
 * Intelligence Aggregation Pipeline.
 *
 * Runs after a VisibilityScan finalizes. Materializes:
 *   - daily score snapshot for the project (this scan's day)
 *   - competitor daily metrics
 *   - citation daily metrics
 *   - per-provider volatility (using trailing snapshots)
 *   - insight records (deduplicated by kind+day)
 *
 * Idempotent: re-running for the same `(project, day)` overwrites the
 * day's rows. The pipeline reads the workspace's ScoringConfig (or
 * falls back to DEFAULT_OPTIONS) so weight changes apply on the next
 * scan without a deploy.
 */

const TREND_WINDOW_DAYS = 14;

export const runIntelligencePipeline = async (input: {
  workspaceId: string;
  projectId: string;
  scanId: string;
}): Promise<void> => {
  const { workspaceId, projectId, scanId } = input;

  // ---- Load scan + dependent data in one pass ----
  const [scan, project, runs] = await Promise.all([
    prisma.visibilityScan.findUnique({
      where: { id: scanId },
      select: { id: true, createdAt: true, projectId: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, domain: true },
    }),
    prisma.promptRun.findMany({
      where: { scanId, status: { in: ["COMPLETED", "CACHED"] } },
      select: {
        provider: true,
        brandMentioned: true,
        brandRank: true,
        sentimentScore: true,
        prompt: { select: { category: true } },
        mentions: { select: { kind: true, entity: true, rank: true } },
        citations: { select: { domain: true, rank: true } },
      },
    }),
  ]);

  if (!scan || !project) {
    logger.warn({ scanId, projectId }, "intelligence.pipeline: scan/project missing");
    return;
  }
  if (runs.length === 0) {
    logger.info({ scanId }, "intelligence.pipeline: no completed runs, skipping");
    return;
  }

  // ---- Build per-run samples in the shape the engines expect ----
  type RawRun = (typeof runs)[number];
  type RawMention = RawRun["mentions"][number];
  type RawCitation = RawRun["citations"][number];
  const samples: IntelligenceRunSample[] = runs.map((r: RawRun) => {
    const competitorMentions = r.mentions
      .filter((m: RawMention) => m.kind === "COMPETITOR")
      .map((m: RawMention) => ({ entity: m.entity, rank: m.rank }));
    const citationDomains = r.citations.map((c: RawCitation) => ({
      domain: c.domain,
      rank: c.rank,
    }));
    const citationAuthoritySum = citationDomains.reduce(
      (sum: number, c: { domain: string }) => sum + domainAuthority(c.domain),
      0,
    );
    return {
      provider: r.provider,
      promptCategory: r.prompt.category,
      brandMentioned: r.brandMentioned,
      brandRank: r.brandRank,
      sentimentScore: r.sentimentScore,
      citationCount: r.citations.length,
      citationAuthoritySum,
      competitorMentions,
      citationDomains,
    };
  });

  // ---- Load scoring config ----
  const opts = await loadScoringOptions(workspaceId);

  // ---- Score + competitor + citation analysis ----
  const score = computeIntelligenceScore(samples, opts);
  const competitors = analyzeCompetitors(samples);
  const citations = analyzeCitations(samples, project.domain);

  // ---- Persist snapshot + per-day aggregates ----
  await intelligenceRepository.upsertScoreSnapshot({
    workspaceId,
    projectId,
    day: scan.createdAt,
    scanId,
    score,
  });
  await intelligenceRepository.upsertCompetitorMetrics({
    workspaceId,
    projectId,
    day: scan.createdAt,
    aggregates: competitors.aggregates,
  });
  await intelligenceRepository.upsertCitationMetrics({
    workspaceId,
    projectId,
    day: scan.createdAt,
    aggregates: citations.aggregates,
  });

  // ---- Trend + volatility from snapshot history ----
  const history = await intelligenceRepository.listScoreSnapshots(
    projectId,
    TREND_WINDOW_DAYS,
  );
  type SnapshotRow = (typeof history)[number];
  const scoreSeries = history.map((h: SnapshotRow) => ({
    day: isoDay(h.day),
    value: h.total,
  }));
  const scoreTrend = summarizeTrend(scoreSeries);

  const perProviderSeries: Partial<
    Record<ProviderId, Array<{ day: string; value: number }>>
  > = {};
  for (const h of history as SnapshotRow[]) {
    const byProvider = h.byProvider as Record<string, number>;
    for (const [provider, value] of Object.entries(byProvider)) {
      const key = provider as ProviderId;
      const list = perProviderSeries[key] ?? [];
      list.push({ day: isoDay(h.day), value });
      perProviderSeries[key] = list;
    }
  }

  const volatilityMetrics = Object.entries(perProviderSeries).map(
    ([provider, series]) =>
      computeProviderVolatility(
        provider as ProviderId,
        series ?? [],
        // No per-day rank history materialized yet; supply empty so
        // rankStability decays to its neutral default. A future
        // migration can add a rank snapshot to address this properly.
        [],
      ),
  );

  await intelligenceRepository.upsertVolatility({
    workspaceId,
    projectId,
    day: scan.createdAt,
    metrics: volatilityMetrics,
  });

  // ---- Insights ----
  const ctx: InsightContext = {
    todayIso: isoDay(scan.createdAt),
    scoreSeries,
    perProviderSeries,
    latestScore: score,
    scoreTrend,
    competitors,
    citations,
    volatility: volatilityMetrics,
    providerLabel: (p) => PROVIDER_LABEL[p] ?? p,
  };
  const insights = generateInsights(ctx);

  await intelligenceRepository.upsertInsights({
    workspaceId,
    projectId,
    insights,
  });

  logger.info(
    {
      scanId,
      projectId,
      score: score.total,
      sampleSize: score.sampleSize,
      insights: insights.length,
    },
    "intelligence.pipeline: completed",
  );

  // ---- Trigger GEO recommendations ----
  // Imported lazily to avoid a circular module load (geo reads from
  // ai-visibility's intelligence engine for context).
  try {
    const { runGeoPipeline } = await import("@/modules/geo/application/pipeline");
    await runGeoPipeline({ workspaceId, projectId });
  } catch (err) {
    logger.error(
      { scanId, err: err instanceof Error ? err.message : err },
      "geo pipeline failed (intelligence already persisted)",
    );
  }

  // ---- Trigger Executive Insight Engine ----
  // Lazy import breaks the potential circular dependency chain
  // (executive-insights → ai-visibility for snapshots, but only read-side).
  try {
    const { runExecutiveInsightPipeline } = await import(
      "@/modules/executive-insights"
    );
    await runExecutiveInsightPipeline({ workspaceId, projectId });
  } catch (err) {
    logger.error(
      { scanId, err: err instanceof Error ? err.message : err },
      "executive insight pipeline failed (intelligence already persisted)",
    );
  }
};

const loadScoringOptions = async (
  workspaceId: string,
): Promise<ScoringOptions> => {
  const cfg = await intelligenceRepository.getScoringConfig(workspaceId);
  if (!cfg) return DEFAULT_OPTIONS;
  const weights: ScoringWeights = {
    citationRate: cfg.weightCitationRate,
    rankBonus: cfg.weightRankBonus,
    sentimentBonus: cfg.weightSentimentBonus,
    citationDensity: cfg.weightCitationDensity,
    providerMultipliers:
      (cfg.providerWeights as Partial<Record<ProviderId, number>> | null) ?? {},
  };
  return {
    weights: { ...DEFAULT_WEIGHTS, ...weights },
    minRunsForConfidence: cfg.minRunsForConfidence,
    sentimentAdjusted: cfg.sentimentAdjusted,
    authorityWeighted: cfg.authorityWeighted,
  };
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
