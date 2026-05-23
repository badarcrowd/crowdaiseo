// Domain types
export type {
  AnomalyReport,
  AnomalySeverity,
  AnomalyType,
  Anomaly,
  ConfidenceBreakdown,
  ConfidenceScore,
  ConfidenceTier,
  EvidenceTrace,
  Explanation,
  ExplanationReason,
  ExplanationSubject,
  FreshnessBadge,
  FreshnessStatus,
  FreshnessWarning,
  FreshnessWarningCode,
  ProviderContribution,
  CitationContribution,
  PromptContribution,
  ScoreChangeSummary,
  SnapshotReference,
  TrustContext,
  TrustEnvelope,
} from "./domain/types";

// Constants
export {
  ANOMALY_Z_THRESHOLD,
  FRESH_HOURS,
  MIN_RUNS_FOR_FULL_CONFIDENCE,
  RECENT_HOURS,
  STALE_HOURS,
} from "./domain/constants";

// Application: Confidence
export { computeConfidence } from "./application/confidence";
export type { ConfidenceInput } from "./application/confidence";

// Application: Freshness
export { assessFreshness } from "./application/freshness";
export type { FreshnessInput } from "./application/freshness";

// Application: Anomaly Detection
export { detectAnomalies } from "./application/anomaly";
export type {
  AnomalyInput,
  CitationDomainSeries,
  CompetitorSovSeries,
  ProviderScoreSeries,
  SentimentSeries,
  ScanTimelineSeries,
} from "./application/anomaly";

// Application: Evidence Trace
export { buildEvidenceTrace } from "./application/evidence-trace";
export type { EvidenceTraceInput, RawRunForTrace, RawCitationForTrace } from "./application/evidence-trace";

// Application: Explainability
export {
  explainCompetitorDominance,
  explainInsight,
  explainProviderProfile,
  explainRecommendation,
  explainScoreChange,
  explainTrend,
} from "./application/explainability";
export type {
  CompetitorDominanceInput,
  InsightExplanationInput,
  ProviderProfileExplanationInput,
  RecommendationExplanationInput,
  TrendExplanationInput,
} from "./application/explainability";

// Application: DB Queries (server-only)
export {
  buildFreshnessInput,
  loadAnomalyInput,
  loadEvidenceTraceInput,
  loadScoreChangeSummary,
  loadTrustContext,
} from "./application/queries";

// Application: Trust Aggregator (server-only)
export {
  buildProjectTrustBundle,
  wrapWithTrust,
} from "./application/aggregator";
export type { ProjectTrustBundle } from "./application/aggregator";
