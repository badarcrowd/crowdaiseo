import type { ProviderId } from "@prisma/client";
import {
  FRESH_HOURS,
  MIN_RUNS_PER_PROVIDER,
  MIN_SNAPSHOTS_FOR_COMPLETE,
  OUTDATED_HOURS,
  RECENT_HOURS,
  SCAN_GAP_WARNING_DAYS,
  STALE_HOURS,
} from "../domain/constants";
import type {
  FreshnessBadge,
  FreshnessStatus,
  FreshnessWarning,
} from "../domain/types";

export type FreshnessInput = {
  lastScanAt: Date | null;
  lastSnapshotAt: Date | null;
  snapshotCount: number;
  /** Providers that have at least MIN_RUNS_PER_PROVIDER runs in the window. */
  providersWithRecentData: ProviderId[];
  /** All providers the workspace uses. */
  allProviders: ProviderId[];
  /** Total runs in the past 30 days. */
  totalRunsLast30d: number;
  /** Largest gap (in days) between consecutive scans in the window. */
  scanGapDays: number | null;
};

/**
 * Data Freshness Layer.
 *
 * Assesses staleness, coverage gaps, and dataset completeness without
 * touching a database — all inputs come from the caller's trust context.
 *
 * Badge ladder (based on age of last scan):
 *   FRESH   < 24 h
 *   RECENT  < 72 h
 *   STALE   < 7 d
 *   OUTDATED < 30 d
 *   MISSING  no scans ever / > 30 d
 */
export const assessFreshness = (input: FreshnessInput): FreshnessStatus => {
  const { lastScanAt, lastSnapshotAt, snapshotCount, providersWithRecentData,
    allProviders, totalRunsLast30d, scanGapDays } = input;

  const now = Date.now();
  const ageHours = lastScanAt
    ? (now - lastScanAt.getTime()) / 3_600_000
    : Infinity;

  const badge = computeBadge(ageHours);
  const isStale = ageHours >= STALE_HOURS;
  const isOutdated = ageHours >= OUTDATED_HOURS;
  const isMissing = ageHours === Infinity;

  const missingProviders = allProviders.filter(
    (p) => !providersWithRecentData.includes(p),
  );

  const warnings: FreshnessWarning[] = [];

  if (isMissing || totalRunsLast30d === 0) {
    warnings.push({
      code: "NO_RECENT_SCANS",
      message: "No scans have been completed. Scores cannot be computed.",
      severity: "ERROR",
    });
  } else if (isOutdated) {
    warnings.push({
      code: "STALE_SNAPSHOTS",
      message: `Last scan was ${Math.round(ageHours / 24)} days ago. Data is significantly outdated.`,
      severity: "ERROR",
    });
  } else if (isStale) {
    warnings.push({
      code: "STALE_SNAPSHOTS",
      message: `Last scan was ${Math.round(ageHours / 24)} days ago. Consider running a new scan.`,
      severity: "WARNING",
    });
  }

  if (missingProviders.length > 0) {
    warnings.push({
      code: "MISSING_PROVIDER_COVERAGE",
      message: `Providers with no recent data: ${missingProviders.join(", ")}. Results may be skewed.`,
      severity: "WARNING",
    });
  }

  if (snapshotCount < MIN_SNAPSHOTS_FOR_COMPLETE) {
    warnings.push({
      code: "INSUFFICIENT_EVIDENCE_WINDOW",
      message: `Only ${snapshotCount} daily snapshots available (minimum ${MIN_SNAPSHOTS_FOR_COMPLETE} recommended for trend analysis).`,
      severity: "WARNING",
    });
  }

  if (totalRunsLast30d > 0 && totalRunsLast30d < MIN_RUNS_PER_PROVIDER * allProviders.length) {
    warnings.push({
      code: "INCOMPLETE_DATASET",
      message: `${totalRunsLast30d} total runs in the last 30 days — below the recommended minimum for reliable scoring.`,
      severity: "WARNING",
    });
  }

  if (scanGapDays !== null && scanGapDays >= SCAN_GAP_WARNING_DAYS) {
    warnings.push({
      code: "SCAN_GAP_DETECTED",
      message: `A ${scanGapDays}-day gap was detected between consecutive scans. Historical comparisons may be unreliable.`,
      severity: "WARNING",
    });
  }

  const referenceAt = lastSnapshotAt ?? lastScanAt;

  return {
    badge,
    lastUpdatedAt: referenceAt ? referenceAt.toISOString() : null,
    ageHours: isMissing ? -1 : round1(ageHours),
    isStale,
    isOutdated,
    isMissing,
    coverageGaps: missingProviders,
    warnings,
  };
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const computeBadge = (ageHours: number): FreshnessBadge => {
  if (!isFinite(ageHours)) return "MISSING";
  if (ageHours < FRESH_HOURS) return "FRESH";
  if (ageHours < RECENT_HOURS) return "RECENT";
  if (ageHours < STALE_HOURS) return "STALE";
  return "OUTDATED";
};

const round1 = (n: number) => Math.round(n * 10) / 10;
