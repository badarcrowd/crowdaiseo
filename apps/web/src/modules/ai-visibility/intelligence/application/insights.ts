import type { ProviderId } from "@prisma/client";
import type {
  CitationIntelligence,
  CompetitorIntelligence,
  GeneratedInsight,
  IntelligenceScore,
  TrendSummary,
  VolatilityMetric,
} from "../domain/types";

/**
 * Insight Generation Layer.
 *
 * All insight strings are assembled from fixed templates with numeric
 * substitution — there is NO LLM in this path. The contract is:
 *
 *   - Templates live in this file only.
 *   - Every insight comes with a `confidence` and is dropped if below
 *     MIN_CONFIDENCE.
 *   - Insights are deduplicated by `(kind, forDay)` upstream (DB
 *     uniqueness constraint).
 *
 * This is deliberate. Customers act on insight text directly; an LLM
 * hallucination at this layer would mean a CMO making the wrong call
 * because of a fabricated number. The cost of a wooden phrasing is
 * trivially less than the cost of a wrong number.
 */

const MIN_CONFIDENCE = 0.5;

export type InsightContext = {
  todayIso: string; // YYYY-MM-DD
  // Score history — most recent point is "today".
  scoreSeries: Array<{ day: string; value: number }>;
  perProviderSeries: Partial<Record<ProviderId, Array<{ day: string; value: number }>>>;
  latestScore: IntelligenceScore;
  scoreTrend: TrendSummary;
  competitors: CompetitorIntelligence;
  citations: CitationIntelligence;
  volatility: VolatilityMetric[];
  // Optional — caller passes provider labels for prettier copy.
  providerLabel?: (p: ProviderId) => string;
};

const fmt = {
  pct: (n: number) => `${Math.round(Math.abs(n))}%`,
  signedPct: (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}%`,
  num: (n: number) => Math.round(n).toString(),
};

export const generateInsights = (ctx: InsightContext): GeneratedInsight[] => {
  const out: GeneratedInsight[] = [];
  const label = ctx.providerLabel ?? ((p: ProviderId) => p);

  // -----------------------------------------------------------------
  // Score deltas
  // -----------------------------------------------------------------
  if (Math.abs(ctx.scoreTrend.pctChange) >= 5 && ctx.latestScore.confidence >= 0.4) {
    const positive = ctx.scoreTrend.pctChange > 0;
    out.push({
      kind: positive ? "SCORE_DELTA_POSITIVE" : "SCORE_DELTA_NEGATIVE",
      severity: positive ? "INFO" : "ATTENTION",
      title: positive
        ? `Visibility up ${fmt.pct(ctx.scoreTrend.pctChange)}`
        : `Visibility down ${fmt.pct(ctx.scoreTrend.pctChange)}`,
      body: `Your AI visibility score moved ${fmt.signedPct(ctx.scoreTrend.pctChange)} versus the prior period. Latest score: ${ctx.latestScore.total}.`,
      confidence: clamp(ctx.latestScore.confidence, 0, 1),
      metadata: {
        pctChange: ctx.scoreTrend.pctChange,
        score: ctx.latestScore.total,
        direction: ctx.scoreTrend.direction,
      },
      forDay: ctx.todayIso,
    });
  }

  // -----------------------------------------------------------------
  // Per-provider deltas
  // -----------------------------------------------------------------
  for (const [provider, series] of Object.entries(ctx.perProviderSeries)) {
    if (!series || series.length < 4) continue;
    const recent = series.slice(-3).map((p) => p.value);
    const prior = series.slice(-6, -3).map((p) => p.value);
    if (prior.length === 0) continue;
    const recentMean = mean(recent);
    const priorMean = mean(prior);
    if (priorMean === 0) continue;
    const delta = ((recentMean - priorMean) / priorMean) * 100;
    if (Math.abs(delta) < 10) continue;
    const positive = delta > 0;
    const provName = label(provider as ProviderId);
    out.push({
      kind: positive ? "PROVIDER_DELTA_POSITIVE" : "PROVIDER_DELTA_NEGATIVE",
      severity: positive ? "INFO" : "ATTENTION",
      title: positive
        ? `Visibility increased ${fmt.pct(delta)} on ${provName}`
        : `Visibility dropped ${fmt.pct(delta)} on ${provName}`,
      body: `${provName} score over the last 3 days averaged ${Math.round(recentMean)}, vs ${Math.round(priorMean)} the prior 3 days.`,
      confidence: clamp(series.length / 14, 0.4, 0.95),
      metadata: { provider, delta, recentMean, priorMean },
      forDay: ctx.todayIso,
    });
  }

  // -----------------------------------------------------------------
  // Competitor dominance
  // -----------------------------------------------------------------
  for (const gap of ctx.competitors.gaps.slice(0, 5)) {
    if (gap.dominantCategories.length > 0) {
      out.push({
        kind: "COMPETITOR_DOMINANCE",
        severity: "ATTENTION",
        title: `${gap.entity} dominates ${gap.dominantCategories[0].toLowerCase().replace("_", " ")} prompts`,
        body: `${gap.entity} captured the majority of AI mentions in ${gap.dominantCategories.map((c) => c.toLowerCase().replace("_", " ")).join(", ")}. Consider strengthening content targeting these intents.`,
        confidence: 0.7,
        metadata: {
          competitor: gap.entity,
          categories: gap.dominantCategories,
        },
        forDay: ctx.todayIso,
      });
    }
    if (gap.delta < -5) {
      out.push({
        kind: "COMPETITOR_GAP",
        severity: gap.delta < -20 ? "CRITICAL" : "ATTENTION",
        title: `${gap.entity} appeared ${Math.abs(gap.delta)} more times than your brand`,
        body: `Across the latest scan window, ${gap.entity} was mentioned in ${Math.abs(gap.delta)} more runs than your brand. This is a meaningful share-of-voice gap.`,
        confidence: 0.75,
        metadata: { competitor: gap.entity, delta: gap.delta },
        forDay: ctx.todayIso,
      });
    }
  }

  // -----------------------------------------------------------------
  // Citation opportunities
  // -----------------------------------------------------------------
  for (const opp of ctx.citations.opportunities.slice(0, 5)) {
    out.push({
      kind:
        opp.reason === "high-authority-no-brand-link"
          ? "CITATION_AUTHORITY_GAP"
          : "CITATION_OPPORTUNITY",
      severity: "INFO",
      title: `AI providers lean on ${opp.domain}`,
      body: `${opp.detail} Earning a presence on ${opp.domain} would likely shift future AI recommendations toward your brand.`,
      confidence: opp.score,
      metadata: { domain: opp.domain, reason: opp.reason },
      forDay: ctx.todayIso,
    });
  }

  // -----------------------------------------------------------------
  // Provider volatility
  // -----------------------------------------------------------------
  for (const v of ctx.volatility) {
    if (v.volatility >= 0.4 && v.sampleSize >= 5) {
      out.push({
        kind: "PROVIDER_VOLATILITY",
        severity: v.volatility >= 0.6 ? "ATTENTION" : "INFO",
        title: `${label(v.provider)} responses are volatile`,
        body: `Your visibility score on ${label(v.provider)} has been swinging significantly day-to-day. This often signals prompt sensitivity or a recently changed model.`,
        confidence: clamp(v.sampleSize / 14, 0.4, 0.9),
        metadata: { provider: v.provider, volatility: v.volatility },
        forDay: ctx.todayIso,
      });
    }
  }

  // -----------------------------------------------------------------
  // Anomaly
  // -----------------------------------------------------------------
  if (ctx.scoreTrend.isAnomaly && ctx.latestScore.confidence >= 0.4) {
    out.push({
      kind: "ANOMALY_DETECTED",
      severity: "ATTENTION",
      title: `Unusual score movement detected`,
      body: `Today's visibility score (${ctx.latestScore.total}) is ${Math.abs(ctx.scoreTrend.latestZ).toFixed(1)} standard deviations from the recent baseline. Worth investigating which prompts changed.`,
      confidence: 0.6,
      metadata: {
        z: ctx.scoreTrend.latestZ,
        score: ctx.latestScore.total,
      },
      forDay: ctx.todayIso,
    });
  }

  return out.filter((i) => i.confidence >= MIN_CONFIDENCE);
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
