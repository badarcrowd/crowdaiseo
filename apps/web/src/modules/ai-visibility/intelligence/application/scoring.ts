import type { ProviderId } from "@prisma/client";
import type {
  IntelligenceRunSample,
  IntelligenceScore,
  ScoreExplanation,
  ScoringOptions,
  ScoringWeights,
} from "../domain/types";

/**
 * Visibility Scoring Engine — configurable, explainable, with confidence.
 *
 * Extends the simple `scoreScan` heuristic in `application/scorer.ts` with:
 *   - per-workspace configurable weights (ScoringConfig)
 *   - per-provider multipliers
 *   - confidence based on sample size
 *   - authority-weighted citation bonus (opt-in)
 *   - explicit, human-readable contribution explanations
 *
 * The score remains a transparent weighted sum of normalized signals.
 * No ML, no opaque transformations. A support engineer can trace every
 * point of any score back to the underlying samples.
 */

export const DEFAULT_WEIGHTS: ScoringWeights = {
  citationRate: 60,
  rankBonus: 10,
  sentimentBonus: 15,
  citationDensity: 15,
  providerMultipliers: {},
};

export const DEFAULT_OPTIONS: ScoringOptions = {
  weights: DEFAULT_WEIGHTS,
  minRunsForConfidence: 20,
  sentimentAdjusted: true,
  authorityWeighted: false,
};

export const computeIntelligenceScore = (
  samples: IntelligenceRunSample[],
  opts: ScoringOptions = DEFAULT_OPTIONS,
): IntelligenceScore => {
  const byProvider = groupBy(samples, (s) => s.provider);
  const sub: Partial<Record<ProviderId, number>> = {};
  for (const [provider, runs] of byProvider) {
    const base = scoreSubset(runs, opts);
    const mult = opts.weights.providerMultipliers[provider] ?? 1;
    sub[provider] = Math.round(clamp(base * mult, 0, 100));
  }

  const subValues = Object.values(sub).filter((v): v is number => v !== undefined);
  const total = subValues.length
    ? Math.round(subValues.reduce((a, b) => a + b, 0) / subValues.length)
    : 0;

  const breakdown = aggregateBreakdown(samples, opts);
  const confidence = clamp(
    samples.length / Math.max(1, opts.minRunsForConfidence),
    0,
    1,
  );

  return {
    total,
    byProvider: sub as Record<ProviderId, number>,
    breakdown,
    confidence,
    sampleSize: samples.length,
    weightsUsed: opts.weights,
    explanations: explain(samples, breakdown, opts),
  };
};

const scoreSubset = (
  runs: IntelligenceRunSample[],
  opts: ScoringOptions,
): number => {
  if (runs.length === 0) return 0;
  const w = opts.weights;
  const mentioned = runs.filter((r) => r.brandMentioned);
  const citationRate = mentioned.length / runs.length;

  const ranks = mentioned
    .map((r) => r.brandRank)
    .filter((r): r is number => r !== null);
  const avgRank = ranks.length > 0 ? mean(ranks) : null;

  const sentiments = mentioned
    .map((r) => r.sentimentScore)
    .filter((s): s is number => s !== null);
  const avgSentiment = sentiments.length > 0 ? mean(sentiments) : 0;

  const citationBase = opts.authorityWeighted
    ? mean(runs.map((r) => r.citationAuthoritySum))
    : mean(runs.map((r) => r.citationCount));

  const baseFromRate = citationRate * w.citationRate;
  const rankBonus =
    avgRank !== null
      ? clamp(w.rankBonus - (avgRank - 1) * (w.rankBonus / 5), 0, w.rankBonus)
      : 0;
  const sentimentBonus = opts.sentimentAdjusted
    ? clamp(avgSentiment * w.sentimentBonus, -w.sentimentBonus, w.sentimentBonus)
    : 0;
  const citationBonus = clamp(
    citationBase * (w.citationDensity / 5),
    0,
    w.citationDensity,
  );

  const raw = baseFromRate + rankBonus + sentimentBonus + citationBonus;
  return clamp(raw, 0, 100);
};

const aggregateBreakdown = (
  samples: IntelligenceRunSample[],
  opts: ScoringOptions,
): IntelligenceScore["breakdown"] => {
  const mentioned = samples.filter((s) => s.brandMentioned);
  const ranks = mentioned
    .map((s) => s.brandRank)
    .filter((r): r is number => r !== null);
  const sentiments = mentioned
    .map((s) => s.sentimentScore)
    .filter((s): s is number => s !== null);
  const avgSentiment = sentiments.length > 0 ? mean(sentiments) : 0;
  const totalCitations = samples.reduce((a, s) => a + s.citationCount, 0);
  const authoritySum = samples.reduce((a, s) => a + s.citationAuthoritySum, 0);

  return {
    citationRate: samples.length ? mentioned.length / samples.length : 0,
    avgRank: ranks.length ? round1(mean(ranks)) : null,
    sentimentBonus: opts.sentimentAdjusted
      ? clamp(
          avgSentiment * opts.weights.sentimentBonus,
          -opts.weights.sentimentBonus,
          opts.weights.sentimentBonus,
        )
      : 0,
    citationCount: totalCitations,
    authorityBonus: opts.authorityWeighted
      ? round2(authoritySum / Math.max(1, samples.length))
      : 0,
  };
};

const explain = (
  samples: IntelligenceRunSample[],
  breakdown: IntelligenceScore["breakdown"],
  opts: ScoringOptions,
): ScoreExplanation[] => {
  const out: ScoreExplanation[] = [];
  const baseContribution = breakdown.citationRate * opts.weights.citationRate;
  out.push({
    label: "Mention rate",
    contribution: round1(baseContribution),
    detail: `Brand appeared in ${Math.round(breakdown.citationRate * 100)}% of ${samples.length} runs.`,
  });
  if (breakdown.avgRank !== null) {
    const rankContrib = Math.max(
      0,
      opts.weights.rankBonus - (breakdown.avgRank - 1) * (opts.weights.rankBonus / 5),
    );
    out.push({
      label: "Rank position",
      contribution: round1(rankContrib),
      detail: `Average rank when mentioned: ${breakdown.avgRank.toFixed(1)}.`,
    });
  }
  if (opts.sentimentAdjusted) {
    out.push({
      label: "Sentiment",
      contribution: round1(breakdown.sentimentBonus),
      detail:
        breakdown.sentimentBonus > 0
          ? "Coverage skews positive."
          : breakdown.sentimentBonus < 0
            ? "Coverage skews negative."
            : "Coverage is neutral.",
    });
  }
  if (opts.authorityWeighted) {
    out.push({
      label: "Authority bonus",
      contribution: round1(breakdown.authorityBonus * (opts.weights.citationDensity / 5)),
      detail: `Mean authority-weighted citations per run: ${breakdown.authorityBonus.toFixed(2)}.`,
    });
  }
  return out;
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

const groupBy = <T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> => {
  const out = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
};
