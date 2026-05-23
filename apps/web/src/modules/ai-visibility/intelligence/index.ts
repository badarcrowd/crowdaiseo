/**
 * Public surface of the Visibility Intelligence Engine.
 *
 * All callers (server actions, API routes, dashboards) import from here.
 * Internal modules — algorithms, repositories, templates — remain
 * private to the intelligence/ folder.
 */

// Read-side queries
export { intelligenceQueries } from "./application/queries";

// Pipeline trigger — exposed so a maintenance command can re-run
// intelligence for a given scan (e.g. after weight changes).
export { runIntelligencePipeline } from "./application/pipeline";

// Repository (config writes, insight acknowledgement)
export { intelligenceRepository } from "./infrastructure/intelligence.repository";

// Pure engines (useful for tests + ad-hoc tooling)
export {
  computeIntelligenceScore,
  DEFAULT_WEIGHTS,
  DEFAULT_OPTIONS,
} from "./application/scoring";
export { analyzeCompetitors } from "./application/competitors";
export { analyzeCitations } from "./application/citations";
export { summarizeTrend, computeProviderVolatility } from "./application/trends";
export { generateInsights } from "./application/insights";

// Authority data
export {
  domainAuthority,
  domainCategory,
  AUTHORITY_TABLE,
  DEFAULT_AUTHORITY,
} from "./domain/authority";

// Types
export type {
  IntelligenceRunSample,
  IntelligenceScore,
  ScoringOptions,
  ScoringWeights,
  ScoreExplanation,
  CompetitorAggregate,
  CompetitorGap,
  CompetitorOverlap,
  CompetitorIntelligence,
  CitationAggregate,
  CitationOpportunity,
  CitationIntelligence,
  TrendSeriesPoint,
  TrendSummary,
  VolatilityMetric,
  GeneratedInsight,
} from "./domain/types";
