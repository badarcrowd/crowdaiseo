import type { ProviderId } from "@prisma/client";
import {
  ANOMALY_Z_THRESHOLD,
  CITATION_SURGE_THRESHOLD,
  COMPETITOR_SOV_SURGE_THRESHOLD,
  CRITICAL_Z_THRESHOLD,
  SCAN_GAP_WARNING_DAYS,
  SENTIMENT_SWING_THRESHOLD,
} from "../domain/constants";
import type {
  Anomaly,
  AnomalyReport,
  AnomalySeverity,
  AnomalyType,
} from "../domain/types";

export type ProviderScoreSeries = {
  provider: ProviderId;
  series: Array<{ day: string; score: number }>;
};

export type CompetitorSovSeries = {
  entity: string;
  series: Array<{ day: string; sov: number }>;
};

export type CitationDomainSeries = {
  domain: string;
  series: Array<{ day: string; count: number }>;
};

export type SentimentSeries = {
  series: Array<{ day: string; sentiment: number }>;
};

export type ScanTimelineSeries = {
  /** Dates (ISO YYYY-MM-DD) on which scans completed, sorted ascending. */
  scanDates: string[];
};

export type AnomalyInput = {
  providerScores: ProviderScoreSeries[];
  competitorSov: CompetitorSovSeries[];
  citationDomains: CitationDomainSeries[];
  sentiment: SentimentSeries;
  scanTimeline: ScanTimelineSeries;
};

/**
 * Anomaly Detection Engine.
 *
 * Detects statistical and directional anomalies across five dimensions:
 *   1. Provider score spikes / drops (z-score)
 *   2. Competitor share-of-voice surges (delta threshold)
 *   3. Citation domain surges / disappearances (delta threshold)
 *   4. Sentiment swings (absolute delta threshold)
 *   5. Scan timeline gaps
 *
 * All detections are deterministic — same input always produces same output.
 * No ML, no probability models, no AI inference.
 */
export const detectAnomalies = (input: AnomalyInput): AnomalyReport => {
  const anomalies: Anomaly[] = [
    ...detectProviderAnomalies(input.providerScores),
    ...detectCompetitorAnomalies(input.competitorSov),
    ...detectCitationAnomalies(input.citationDomains),
    ...detectSentimentAnomalies(input.sentiment),
    ...detectScanGaps(input.scanTimeline),
  ];

  const worstSeverity = resolveWorstSeverity(anomalies);

  return {
    anomalies,
    hasAnomalies: anomalies.length > 0,
    worstSeverity,
    detectedAt: new Date().toISOString(),
  };
};

// -------------------------------------------------------------------------
// Provider score spikes and drops
// -------------------------------------------------------------------------

const detectProviderAnomalies = (
  providerScores: ProviderScoreSeries[],
): Anomaly[] => {
  const out: Anomaly[] = [];
  for (const { provider, series } of providerScores) {
    if (series.length < 3) continue;
    const values = series.map((p) => p.score);
    const latest = values[values.length - 1]!;
    const window = values.slice(0, -1);
    const wMean = mean(window);
    const wStd = stddev(window, wMean);
    if (wStd === 0) continue;

    const z = (latest - wMean) / wStd;
    if (Math.abs(z) < ANOMALY_Z_THRESHOLD) continue;

    const type: AnomalyType = z > 0 ? "PROVIDER_SCORE_SPIKE" : "PROVIDER_SCORE_DROP";
    const severity = zSeverity(Math.abs(z));
    const latestDay = series[series.length - 1]!.day;

    out.push({
      type,
      severity,
      description: `${provider} score ${z > 0 ? "spiked" : "dropped"} to ${round1(latest)} (baseline avg ${round1(wMean)}, z=${round2(z)}).`,
      affectedEntity: provider,
      detectedAt: latestDay,
      zScore: round2(z),
      delta: round1(latest - wMean),
      baseline: round1(wMean),
      observed: round1(latest),
    });
  }
  return out;
};

// -------------------------------------------------------------------------
// Competitor share-of-voice surges
// -------------------------------------------------------------------------

const detectCompetitorAnomalies = (
  competitorSov: CompetitorSovSeries[],
): Anomaly[] => {
  const out: Anomaly[] = [];
  for (const { entity, series } of competitorSov) {
    if (series.length < 2) continue;
    const latest = series[series.length - 1]!.sov;
    const prev = series[series.length - 2]!.sov;
    const delta = latest - prev;
    if (delta < COMPETITOR_SOV_SURGE_THRESHOLD) continue;

    out.push({
      type: "COMPETITOR_SURGE",
      severity: delta >= COMPETITOR_SOV_SURGE_THRESHOLD * 2 ? "HIGH" : "MEDIUM",
      description: `${entity} share-of-voice jumped +${round1(delta)} pp to ${round1(latest)}% in a single period.`,
      affectedEntity: entity,
      detectedAt: series[series.length - 1]!.day,
      delta: round1(delta),
      baseline: round1(prev),
      observed: round1(latest),
    });
  }
  return out;
};

// -------------------------------------------------------------------------
// Citation domain surges and disappearances
// -------------------------------------------------------------------------

const detectCitationAnomalies = (
  citationDomains: CitationDomainSeries[],
): Anomaly[] => {
  const out: Anomaly[] = [];
  for (const { domain, series } of citationDomains) {
    if (series.length < 2) continue;
    const latest = series[series.length - 1]!.count;
    const prev = series[series.length - 2]!.count;
    const delta = latest - prev;

    if (Math.abs(delta) < CITATION_SURGE_THRESHOLD) continue;

    const type: AnomalyType = delta > 0 ? "CITATION_DOMAIN_SURGE" : "CITATION_DOMAIN_DISAPPEAR";
    out.push({
      type,
      severity: Math.abs(delta) >= CITATION_SURGE_THRESHOLD * 3 ? "HIGH" : "MEDIUM",
      description: delta > 0
        ? `${domain} citation count surged +${delta} to ${latest} citations.`
        : `${domain} citations dropped ${delta} to ${latest} (possible delistment or change).`,
      affectedEntity: domain,
      detectedAt: series[series.length - 1]!.day,
      delta,
      baseline: prev,
      observed: latest,
    });
  }
  return out;
};

// -------------------------------------------------------------------------
// Sentiment swings
// -------------------------------------------------------------------------

const detectSentimentAnomalies = (sentiment: SentimentSeries): Anomaly[] => {
  const { series } = sentiment;
  if (series.length < 2) return [];

  const latest = series[series.length - 1]!.sentiment;
  const prev = series[series.length - 2]!.sentiment;
  const delta = latest - prev;

  if (Math.abs(delta) < SENTIMENT_SWING_THRESHOLD) return [];

  return [
    {
      type: "SENTIMENT_SWING",
      severity: Math.abs(delta) >= SENTIMENT_SWING_THRESHOLD * 2 ? "HIGH" : "MEDIUM",
      description: `Brand sentiment ${delta > 0 ? "improved" : "dropped"} by ${round2(Math.abs(delta))} points (from ${round2(prev)} to ${round2(latest)}).`,
      affectedEntity: "brand_sentiment",
      detectedAt: series[series.length - 1]!.day,
      delta: round2(delta),
      baseline: round2(prev),
      observed: round2(latest),
    },
  ];
};

// -------------------------------------------------------------------------
// Scan timeline gaps
// -------------------------------------------------------------------------

const detectScanGaps = (timeline: ScanTimelineSeries): Anomaly[] => {
  const { scanDates } = timeline;
  if (scanDates.length < 2) return [];

  const out: Anomaly[] = [];
  for (let i = 1; i < scanDates.length; i++) {
    const prev = new Date(scanDates[i - 1]!).getTime();
    const curr = new Date(scanDates[i]!).getTime();
    const gapDays = (curr - prev) / 86_400_000;
    if (gapDays >= SCAN_GAP_WARNING_DAYS) {
      out.push({
        type: "MISSING_SCAN_GAP",
        severity: gapDays >= SCAN_GAP_WARNING_DAYS * 2 ? "HIGH" : "LOW",
        description: `${Math.round(gapDays)}-day gap between scans (${scanDates[i - 1]} → ${scanDates[i]}). Historical comparisons spanning this gap may be unreliable.`,
        affectedEntity: "scan_timeline",
        detectedAt: scanDates[i]!,
        delta: round1(gapDays),
      });
    }
  }
  return out;
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const stddev = (xs: number[], m: number): number => {
  if (xs.length === 0) return 0;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
};

const zSeverity = (absZ: number): AnomalySeverity => {
  if (absZ >= CRITICAL_Z_THRESHOLD) return "CRITICAL";
  if (absZ >= ANOMALY_Z_THRESHOLD + 0.5) return "HIGH";
  return "MEDIUM";
};

const resolveWorstSeverity = (anomalies: Anomaly[]): AnomalySeverity | null => {
  if (anomalies.length === 0) return null;
  const order: AnomalySeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (const s of order) {
    if (anomalies.some((a) => a.severity === s)) return s;
  }
  return "LOW";
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
