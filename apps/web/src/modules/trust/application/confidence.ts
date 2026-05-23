import {
  ABSOLUTE_MIN_RUNS,
  ANOMALY_PENALTY_PER,
  CONFIDENCE_TIERS,
  MAX_ANOMALY_PENALTY,
  MIN_RUNS_FOR_FULL_CONFIDENCE,
  VOLATILITY_PENALTY_SCALE,
} from "../domain/constants";
import type {
  AnomalyReport,
  ConfidenceScore,
  FreshnessStatus,
} from "../domain/types";

export type ConfidenceInput = {
  /** Total scan runs / snapshots analyzed. */
  evidenceCount: number;
  /** Pre-computed freshness status. */
  freshness: FreshnessStatus;
  /** Mean volatility across relevant providers (0..1). */
  meanVolatility: number;
  /** Pre-computed anomaly report. */
  anomalies: AnomalyReport;
};

/**
 * Confidence Scoring Engine.
 *
 * Produces a single composite 0..1 confidence score for any scored artifact.
 *
 * Formula:
 *   raw       = clamp(evidenceCount / MIN_RUNS_FOR_FULL_CONFIDENCE, 0, 1)
 *   freshness = derived from FreshnessStatus badge
 *   volatility= 1 - (meanVolatility * VOLATILITY_PENALTY_SCALE)
 *   anomaly   = 1 - clamp(anomalyCount * ANOMALY_PENALTY_PER, 0, MAX_ANOMALY_PENALTY)
 *   composite = raw * freshness * volatility * anomaly
 *
 * All four factors are transparent and derivable from the underlying data.
 */
export const computeConfidence = (input: ConfidenceInput): ConfidenceScore => {
  const { evidenceCount, freshness, meanVolatility, anomalies } = input;

  const rawConfidence = clamp(evidenceCount / MIN_RUNS_FOR_FULL_CONFIDENCE, 0, 1);
  const freshnessMultiplier = freshnessToMultiplier(freshness);
  const volatilityMultiplier = clamp(1 - meanVolatility * VOLATILITY_PENALTY_SCALE, 0, 1);
  const anomalyCount = anomalies.anomalies.length;
  const anomalyMultiplier = clamp(1 - anomalyCount * ANOMALY_PENALTY_PER, 1 - MAX_ANOMALY_PENALTY, 1);

  const composite = rawConfidence * freshnessMultiplier * volatilityMultiplier * anomalyMultiplier;
  const score = clamp(evidenceCount < ABSOLUTE_MIN_RUNS ? composite * 0.5 : composite, 0, 1);

  return {
    score: round3(score),
    tier: scoreTier(score),
    evidenceCount,
    freshnessScore: round3(freshnessMultiplier),
    volatilityPenalty: round3(meanVolatility * VOLATILITY_PENALTY_SCALE),
    anomalyPenalty: round3(anomalyCount * ANOMALY_PENALTY_PER),
    breakdown: {
      rawConfidence: round3(rawConfidence),
      freshnessMultiplier: round3(freshnessMultiplier),
      volatilityMultiplier: round3(volatilityMultiplier),
      anomalyMultiplier: round3(anomalyMultiplier),
    },
  };
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const freshnessToMultiplier = (f: FreshnessStatus): number => {
  if (f.isMissing) return 0;
  switch (f.badge) {
    case "FRESH":    return 1.0;
    case "RECENT":   return 0.9;
    case "STALE":    return 0.65;
    case "OUTDATED": return 0.35;
    default:         return 0;
  }
};

const scoreTier = (score: number) => {
  for (const { min, tier } of CONFIDENCE_TIERS) {
    if (score >= min) return tier;
  }
  return "VERY_LOW" as const;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const round3 = (n: number) => Math.round(n * 1000) / 1000;
