import type { ProviderId } from "@prisma/client";
import type { VisibilityScore } from "../domain/entities";

type RunSample = {
  provider: ProviderId;
  brandMentioned: boolean;
  brandRank: number | null;
  sentimentScore: number | null;
  citationCount: number;
};

/**
 * Compute an aggregate AI Visibility Score (0-100) from completed
 * prompt runs.
 *
 * Heuristic blend (intentionally interpretable):
 *
 *   citationRate (0..1)        ×  60   →  base score
 *   + rank bonus               (10..0) →  rewards earlier mentions
 *   + sentiment delta          (±15)   →  positive coverage premium
 *   + citation density bonus   (0..15) →  links to your site
 *
 * Per-provider sub-scores use the same formula on each provider's
 * subset of runs. Providers with zero runs get null (not zero) so the
 * UI can distinguish "not configured" from "configured but unseen".
 *
 * This is deliberately not ML — explainability matters more than a
 * fractional accuracy gain. Anyone on the team can read this and tell
 * a customer exactly why their score changed.
 */
export const scoreScan = (samples: RunSample[]): VisibilityScore => {
  const byProvider = groupBy(samples, (s) => s.provider);
  const sub: Partial<Record<ProviderId, number>> = {};
  for (const [provider, runs] of byProvider) sub[provider] = scoreSubset(runs);

  // Total score: average of per-provider scores, weighted equally.
  const subValues = Object.values(sub).filter((v): v is number => v !== undefined);
  const total = subValues.length
    ? Math.round(subValues.reduce((a, b) => a + b, 0) / subValues.length)
    : 0;

  return {
    total,
    byProvider: sub as Record<ProviderId, number>,
    breakdown: aggregateBreakdown(samples),
  };
};

const scoreSubset = (runs: RunSample[]): number => {
  if (runs.length === 0) return 0;

  const mentioned = runs.filter((r) => r.brandMentioned);
  const citationRate = mentioned.length / runs.length;

  // Average rank (lower is better). Treat "not mentioned" as worst rank
  // for the scoring function — but only `mentioned` contributes to bonus.
  const ranks = mentioned
    .map((r) => r.brandRank)
    .filter((r): r is number => r !== null);
  const avgRank =
    ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;

  const sentiments = mentioned
    .map((r) => r.sentimentScore)
    .filter((s): s is number => s !== null);
  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

  const totalCitations = runs.reduce((a, r) => a + r.citationCount, 0);
  const avgCitationsPerRun = totalCitations / runs.length;

  // Weights — tunable; expressed as max contributions.
  const baseFromRate = citationRate * 60;
  const rankBonus = avgRank !== null ? clamp(10 - (avgRank - 1) * 2, 0, 10) : 0;
  const sentimentBonus = clamp(avgSentiment * 15, -15, 15);
  const citationBonus = clamp(avgCitationsPerRun * 3, 0, 15);

  const raw = baseFromRate + rankBonus + sentimentBonus + citationBonus;
  return Math.round(clamp(raw, 0, 100));
};

const aggregateBreakdown = (samples: RunSample[]): VisibilityScore["breakdown"] => {
  const mentioned = samples.filter((s) => s.brandMentioned);
  const ranks = mentioned
    .map((s) => s.brandRank)
    .filter((r): r is number => r !== null);
  const sentiments = mentioned
    .map((s) => s.sentimentScore)
    .filter((s): s is number => s !== null);

  return {
    citationRate: samples.length ? mentioned.length / samples.length : 0,
    avgRank: ranks.length
      ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
      : null,
    sentimentBonus: sentiments.length
      ? clamp(
          (sentiments.reduce((a, b) => a + b, 0) / sentiments.length) * 15,
          -15,
          15,
        )
      : 0,
    citationCount: samples.reduce((a, s) => a + s.citationCount, 0),
  };
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

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
