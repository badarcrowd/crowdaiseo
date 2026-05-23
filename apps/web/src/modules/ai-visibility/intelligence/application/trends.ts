import type { ProviderId } from "@prisma/client";
import type {
  TrendSeriesPoint,
  TrendSummary,
  VolatilityMetric,
} from "../domain/types";

/**
 * Trend Analysis Engine.
 *
 * Pure functions over time-series — given a chronological array of
 * `{ day, value }` points, return:
 *   - directional summary (slope, % change, anomaly flag)
 *   - per-provider volatility from score histories
 *   - rank stability from rank histories
 *
 * Anomaly detection uses a robust z-score against the trailing window:
 * `z = (latest - mean) / stddev`. This is good enough for "is the
 * newest point suspicious?" without dragging in a full time-series
 * library. The threshold (|z| > 2) is configurable.
 */

const ANOMALY_Z_THRESHOLD = 2;
const FLAT_SLOPE_THRESHOLD = 0.05; // points per day below this → flat

export const summarizeTrend = (
  series: TrendSeriesPoint[],
): TrendSummary => {
  if (series.length === 0) {
    return {
      pctChange: 0,
      slope: 0,
      direction: "flat",
      latestZ: 0,
      isAnomaly: false,
    };
  }

  // ---- % change vs prior equal-length window ----
  const half = Math.floor(series.length / 2);
  const recent = series.slice(series.length - half).map((p) => p.value);
  const prior = series.slice(0, half).map((p) => p.value);
  const recentMean = mean(recent);
  const priorMean = mean(prior);
  const pctChange =
    priorMean === 0
      ? recentMean === 0
        ? 0
        : 100
      : ((recentMean - priorMean) / Math.abs(priorMean)) * 100;

  // ---- Linear regression slope ----
  const slope = linregSlope(series.map((_, i) => i), series.map((p) => p.value));
  const direction: TrendSummary["direction"] =
    Math.abs(slope) < FLAT_SLOPE_THRESHOLD ? "flat" : slope > 0 ? "up" : "down";

  // ---- Anomaly check on the latest point ----
  const window = series.slice(0, -1).map((p) => p.value);
  const latest = series[series.length - 1].value;
  const wMean = mean(window);
  const wStd = stddev(window, wMean);
  const latestZ = wStd === 0 ? 0 : (latest - wMean) / wStd;

  return {
    pctChange: round1(pctChange),
    slope: round3(slope),
    direction,
    latestZ: round2(latestZ),
    isAnomaly: Math.abs(latestZ) >= ANOMALY_Z_THRESHOLD,
  };
};

/**
 * Provider volatility from a per-provider history of scores.
 *
 * `series` is an array of `{ day, value }` representing the provider's
 * score on each day in the window. Volatility = stddev / max_possible
 * (clamped to 0..1). Rank stability is the inverse, computed from rank
 * means: smaller std-dev of ranks = higher stability.
 */
export const computeProviderVolatility = (
  provider: ProviderId,
  scoreSeries: TrendSeriesPoint[],
  rankSeries: TrendSeriesPoint[],
): VolatilityMetric => {
  const scores = scoreSeries.map((p) => p.value);
  const ranks = rankSeries.map((p) => p.value).filter((r) => r > 0);
  const scoreStd = stddev(scores, mean(scores));
  const rankStd = ranks.length > 1 ? stddev(ranks, mean(ranks)) : 0;
  return {
    provider,
    // Normalize against half the max-score range (50 is a generous
    // anchor; any provider whose score swings >50 points day-to-day is
    // saturated at 1.0 volatility, which is correct).
    volatility: clamp(scoreStd / 50, 0, 1),
    rankStability: clamp(1 - rankStd / 10, 0, 1),
    sampleSize: scoreSeries.length,
  };
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const stddev = (xs: number[], m: number): number => {
  if (xs.length === 0) return 0;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
};

const linregSlope = (xs: number[], ys: number[]): number => {
  if (xs.length < 2) return 0;
  const xm = mean(xs);
  const ym = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xm) * (ys[i] - ym);
    den += (xs[i] - xm) ** 2;
  }
  return den === 0 ? 0 : num / den;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
