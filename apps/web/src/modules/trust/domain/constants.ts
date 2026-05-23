import type { ConfidenceTier } from "./types";

// -------------------------------------------------------------------------
// Freshness thresholds
// -------------------------------------------------------------------------

/** Scan age in hours — below this → FRESH. */
export const FRESH_HOURS = 24;

/** Scan age in hours — below this → RECENT. */
export const RECENT_HOURS = 72;

/** Scan age in hours — below this → STALE. */
export const STALE_HOURS = 168; // 7 days

/** Beyond STALE_HOURS → OUTDATED. */
export const OUTDATED_HOURS = 720; // 30 days

/** Minimum number of snapshots to consider a dataset complete. */
export const MIN_SNAPSHOTS_FOR_COMPLETE = 7;

/** Minimum number of runs per provider per window for full coverage. */
export const MIN_RUNS_PER_PROVIDER = 5;

// -------------------------------------------------------------------------
// Confidence thresholds
// -------------------------------------------------------------------------

/** Minimum runs needed for HIGH confidence (100% raw confidence). */
export const MIN_RUNS_FOR_FULL_CONFIDENCE = 20;

/** Minimum runs to produce any meaningful score (below → VERY_LOW). */
export const ABSOLUTE_MIN_RUNS = 3;

export const CONFIDENCE_TIERS: Array<{ min: number; tier: ConfidenceTier }> = [
  { min: 0.8, tier: "VERY_HIGH" },
  { min: 0.6, tier: "HIGH" },
  { min: 0.4, tier: "MEDIUM" },
  { min: 0.2, tier: "LOW" },
  { min: 0,   tier: "VERY_LOW" },
];

// -------------------------------------------------------------------------
// Anomaly detection thresholds
// -------------------------------------------------------------------------

/** Z-score threshold above which a point is flagged as a statistical anomaly. */
export const ANOMALY_Z_THRESHOLD = 2;

/** Z-score threshold for CRITICAL severity. */
export const CRITICAL_Z_THRESHOLD = 3;

/** Absolute delta (percentage points) for sentiment swing to be anomalous. */
export const SENTIMENT_SWING_THRESHOLD = 0.25;

/** Minimum pct-point jump in citation domain count to flag a surge. */
export const CITATION_SURGE_THRESHOLD = 3;

/** Minimum days gap between consecutive scans to flag a gap. */
export const SCAN_GAP_WARNING_DAYS = 5;

/** Competitor SOV jump (pct points) to flag as a surge. */
export const COMPETITOR_SOV_SURGE_THRESHOLD = 15;

// -------------------------------------------------------------------------
// Volatility penalty mapping
// -------------------------------------------------------------------------

/** Volatility 0..1 → penalty applied to confidence. */
export const VOLATILITY_PENALTY_SCALE = 0.3;

/** Per-anomaly confidence penalty (multiplicative). */
export const ANOMALY_PENALTY_PER = 0.05;

/** Maximum total anomaly penalty. */
export const MAX_ANOMALY_PENALTY = 0.25;
