/**
 * Executive Insight Engine — public surface.
 *
 * Converts raw analytics (scores, competitors, citations, crawl data,
 * GEO recommendations) into executive-level strategic intelligence.
 *
 * Pipeline entry points:
 *   - `runExecutiveInsightPipeline` — called from intelligence pipeline
 *     after each scan completes, and from the weekly cron.
 *   - `executiveInsightQueries` — read side for UI consumption.
 *
 * Generators (internal, exported for testing):
 *   - Weekly summary, competitive threats, AI perception,
 *     brand trust, provider recommendations, growth opportunities,
 *     strategic alerts.
 */

// Pipeline
export { runExecutiveInsightPipeline } from "./application/pipeline";

// Read side
export { executiveInsightQueries } from "./application/queries";

// Domain types
export type {
  ExecutiveContext,
  ExecutiveInsight,
  ExecutiveInsightMetadata,
  EvidenceBundle,
  EvidenceItem,
  RankedInsight,
  ScoreSnapshot,
  CompetitorDayMetric,
  CitationDayMetric,
  LatestRun,
  GeoRecSummary,
  ThreatLevel,
} from "./domain/types";

// Generators (exported for unit testing and ad-hoc tooling)
export { generateWeeklySummary } from "./application/generators/weekly-summary";
export { generateCompetitiveThreats } from "./application/generators/competitive-threat";
export { generateAiPerception } from "./application/generators/ai-perception";
export { generateBrandTrust } from "./application/generators/brand-trust";
export { generateProviderRecommendations } from "./application/generators/provider-recommendations";
export { generateGrowthOpportunities } from "./application/generators/growth-opportunities";
export { generateStrategicAlerts } from "./application/generators/strategic-alerts";

// Ranker
export { rankInsights } from "./application/ranker";
export type { RankerInput } from "./application/ranker";
