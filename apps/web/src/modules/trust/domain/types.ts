import type { ProviderId, PromptCategory } from "@prisma/client";

// -------------------------------------------------------------------------
// Confidence Score — attaches to any scored artifact
// -------------------------------------------------------------------------

export type ConfidenceTier = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type ConfidenceBreakdown = {
  rawConfidence: number;       // sampleSize / minRequired, clamped 0..1
  freshnessMultiplier: number; // 0..1 — reduces confidence for stale data
  volatilityMultiplier: number;// 0..1 — reduces confidence for unstable providers
  anomalyMultiplier: number;   // 0..1 — reduces confidence when anomalies present
};

export type ConfidenceScore = {
  score: number;               // 0..1 final composite
  tier: ConfidenceTier;
  evidenceCount: number;       // raw measurement count (runs, snapshots, etc.)
  freshnessScore: number;      // 0..1 (1 = completely fresh)
  volatilityPenalty: number;   // 0..1 subtracted weight from volatility
  anomalyPenalty: number;      // 0..1 subtracted weight from anomalies
  breakdown: ConfidenceBreakdown;
};

// -------------------------------------------------------------------------
// Freshness — data age and coverage assessment
// -------------------------------------------------------------------------

export type FreshnessBadge = "FRESH" | "RECENT" | "STALE" | "OUTDATED" | "MISSING";

export type FreshnessWarningCode =
  | "NO_RECENT_SCANS"
  | "MISSING_PROVIDER_COVERAGE"
  | "INSUFFICIENT_EVIDENCE_WINDOW"
  | "INCOMPLETE_DATASET"
  | "SCAN_GAP_DETECTED"
  | "STALE_SNAPSHOTS"
  | "PROVIDER_DATA_OUTDATED";

export type FreshnessWarning = {
  code: FreshnessWarningCode;
  message: string;
  severity: "INFO" | "WARNING" | "ERROR";
};

export type FreshnessStatus = {
  badge: FreshnessBadge;
  lastUpdatedAt: string | null; // ISO datetime or null if never
  ageHours: number;
  isStale: boolean;
  isOutdated: boolean;
  isMissing: boolean;
  coverageGaps: ProviderId[];   // providers with no recent data
  warnings: FreshnessWarning[];
};

// -------------------------------------------------------------------------
// Anomaly Detection
// -------------------------------------------------------------------------

export type AnomalyType =
  | "PROVIDER_SCORE_SPIKE"
  | "PROVIDER_SCORE_DROP"
  | "SCAN_INCONSISTENCY"
  | "CITATION_DOMAIN_SURGE"
  | "CITATION_DOMAIN_DISAPPEAR"
  | "SENTIMENT_SWING"
  | "COMPETITOR_SURGE"
  | "STATISTICAL_OUTLIER"
  | "MISSING_SCAN_GAP";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Anomaly = {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  affectedEntity: string;
  detectedAt: string;       // ISO date of the anomalous point
  zScore?: number;          // for z-score based detections
  delta?: number;           // signed change (percentage points or raw)
  baseline?: number;
  observed?: number;
};

export type AnomalyReport = {
  anomalies: Anomaly[];
  hasAnomalies: boolean;
  worstSeverity: AnomalySeverity | null;
  detectedAt: string;       // ISO datetime of detection run
};

// -------------------------------------------------------------------------
// Evidence Trace — which data points influenced a given metric
// -------------------------------------------------------------------------

export type PromptContribution = {
  promptId: string;
  category: PromptCategory;
  provider: ProviderId;
  /** Relative contribution weight (0..1) — higher = more influential. */
  weight: number;
  brandMentioned: boolean;
  brandRank: number | null;
  citationCount: number;
};

export type CitationContribution = {
  domain: string;
  count: number;
  authorityScore: number;
  providers: ProviderId[];
};

export type ProviderContribution = {
  provider: ProviderId;
  runsAnalyzed: number;
  mentionRate: number;
  /** Relative weight this provider's data contributed to the aggregate. */
  weight: number;
};

export type SnapshotReference = {
  day: string;             // ISO YYYY-MM-DD
  score: number;
  usedAsBaseline: boolean;
};

export type EvidenceTrace = {
  sourceType: "score" | "insight" | "recommendation" | "trend" | "provider";
  sourceId?: string;
  contributingPrompts: PromptContribution[];
  contributingCitations: CitationContribution[];
  contributingProviders: ProviderContribution[];
  historicalSnapshots: SnapshotReference[];
  totalRunsAnalyzed: number;
  windowDays: number;
};

// -------------------------------------------------------------------------
// Explainability — evidence-backed reasoning for any observable change
// -------------------------------------------------------------------------

export type ExplanationSubject =
  | "SCORE_CHANGE"
  | "COMPETITOR_DOMINANCE"
  | "INSIGHT_GENERATED"
  | "RECOMMENDATION_EXISTS"
  | "TREND_DIRECTION"
  | "PROVIDER_PROFILE";

export type ExplanationReason = {
  label: string;
  detail: string;
  /** The numeric metric that backs this reason. */
  metric: number | string;
  direction: "positive" | "negative" | "neutral";
};

export type Explanation = {
  subject: ExplanationSubject;
  /** 1-2 sentence human-readable summary — evidence-backed only. */
  summary: string;
  reasons: ExplanationReason[];
  /** Always true — no AI-generated hallucinations, all reasons are derived from data. */
  evidenceBacked: true;
};

// -------------------------------------------------------------------------
// Trust Envelope — wraps any metric/insight/recommendation
// -------------------------------------------------------------------------

export type TrustEnvelope<T> = {
  data: T;
  confidence: ConfidenceScore;
  freshness: FreshnessStatus;
  anomalies: AnomalyReport;
  explanation?: Explanation;
  trace?: EvidenceTrace;
};

// -------------------------------------------------------------------------
// Score Change — input for score change explainability
// -------------------------------------------------------------------------

export type ScoreChangeSummary = {
  current: number;
  previous: number;
  delta: number;
  currentCitationRate: number;
  previousCitationRate: number;
  currentSentiment: number;
  previousSentiment: number;
  currentAvgRank: number | null;
  previousAvgRank: number | null;
  currentSampleSize: number;
  previousSampleSize: number;
  windowDays: number;
  byProvider: Record<string, { current: number; previous: number }>;
};

// -------------------------------------------------------------------------
// Trust Context — loaded from DB for a project (read model)
// -------------------------------------------------------------------------

export type TrustContext = {
  projectId: string;
  lastScanAt: string | null;
  lastSnapshotAt: string | null;
  snapshotCount: number;
  providersWithRecentData: ProviderId[];
  allProviders: ProviderId[];
  totalRunsLast30d: number;
  scanGapDays: number | null;
};
