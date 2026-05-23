import type {
  InsightKind,
  InsightSeverity,
  PromptCategory,
  ProviderId,
} from "@prisma/client";

// ---------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------

export type ScoringWeights = {
  citationRate: number;
  rankBonus: number;
  sentimentBonus: number;
  citationDensity: number;
  providerMultipliers: Partial<Record<ProviderId, number>>;
};

export type ScoringOptions = {
  weights: ScoringWeights;
  minRunsForConfidence: number;
  sentimentAdjusted: boolean;
  authorityWeighted: boolean;
};

export type IntelligenceRunSample = {
  provider: ProviderId;
  promptCategory: PromptCategory;
  brandMentioned: boolean;
  brandRank: number | null;
  sentimentScore: number | null;
  citationCount: number;
  // Authority-weighted citation contribution (sum of domain authorities).
  citationAuthoritySum: number;
  competitorMentions: Array<{ entity: string; rank: number }>;
  citationDomains: Array<{ domain: string; rank: number }>;
};

export type ScoreExplanation = {
  label: string;
  contribution: number;
  detail: string;
};

export type IntelligenceScore = {
  total: number;
  byProvider: Record<ProviderId, number>;
  breakdown: {
    citationRate: number;
    avgRank: number | null;
    sentimentBonus: number;
    citationCount: number;
    authorityBonus: number;
  };
  confidence: number;
  sampleSize: number;
  weightsUsed: ScoringWeights;
  explanations: ScoreExplanation[];
};

// ---------------------------------------------------------------------
// Competitor intelligence
// ---------------------------------------------------------------------

export type CompetitorAggregate = {
  entity: string;
  mentions: number;
  appearedInRuns: number;
  totalRuns: number;
  avgRank: number | null;
  byProvider: Record<ProviderId, number>;
  byCategory: Record<PromptCategory, number>;
  shareOfVoice: number;
};

export type CompetitorGap = {
  entity: string;
  // Negative number — your brand appeared this many fewer times than competitor.
  delta: number;
  // Categories where the competitor dominates.
  dominantCategories: PromptCategory[];
  // Providers where the competitor dominates.
  dominantProviders: ProviderId[];
};

export type CompetitorOverlap = {
  entity: string;
  // % of runs where BOTH the brand and the competitor appeared.
  overlapRate: number;
  // % of runs where ONLY the competitor appeared (brand absent).
  exclusiveRate: number;
};

export type CompetitorIntelligence = {
  aggregates: CompetitorAggregate[];
  gaps: CompetitorGap[];
  overlaps: CompetitorOverlap[];
  // Total runs analyzed.
  totalRuns: number;
};

// ---------------------------------------------------------------------
// Citation intelligence
// ---------------------------------------------------------------------

export type CitationAggregate = {
  domain: string;
  count: number;
  appearedInRuns: number;
  totalRuns: number;
  authorityScore: number;
  byProvider: Record<ProviderId, number>;
  avgRank: number | null;
};

export type CitationOpportunity = {
  domain: string;
  reason: "high-authority-no-brand-link" | "frequently-cited-competitor-source";
  // 0..1 — opportunity strength.
  score: number;
  detail: string;
};

export type CitationIntelligence = {
  aggregates: CitationAggregate[];
  opportunities: CitationOpportunity[];
  // Providers ranked by citation diversity (unique domains / total citations).
  providerDiversity: Array<{
    provider: ProviderId;
    diversity: number;
    citations: number;
  }>;
};

// ---------------------------------------------------------------------
// Trend analysis
// ---------------------------------------------------------------------

export type TrendSeriesPoint = {
  day: string; // ISO YYYY-MM-DD
  value: number;
};

export type TrendSummary = {
  // % change over the window vs the prior equal-length window.
  pctChange: number;
  // Slope of a simple linear regression (per day).
  slope: number;
  direction: "up" | "down" | "flat";
  // Standardized residual at the most recent point — magnitudes >2 are anomalies.
  latestZ: number;
  isAnomaly: boolean;
};

export type VolatilityMetric = {
  provider: ProviderId;
  volatility: number; // 0..1
  rankStability: number; // 0..1, higher = more stable
  sampleSize: number;
};

// ---------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------

export type GeneratedInsight = {
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  confidence: number;
  metadata: Record<string, unknown>;
  forDay: string;
};
