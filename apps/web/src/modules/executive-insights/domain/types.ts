import type {
  InsightKind,
  InsightSeverity,
  PromptCategory,
  ProviderId,
} from "@prisma/client";

// -------------------------------------------------------------------------
// Evidence — structured data points that back up an insight claim
// -------------------------------------------------------------------------

export type EvidenceItem = {
  label: string;
  value: number | string;
  /** Signed percentage change vs prior period, when applicable. */
  delta?: number;
  /** Marks the most important data point in the bundle. */
  highlight?: boolean;
};

export type EvidenceBundle = {
  items: EvidenceItem[];
  /** Days of history the evidence draws from. */
  windowDays: number;
  /** Raw measurement count (scan runs, snapshots, etc.). */
  dataPoints: number;
  /** What the comparison baseline is. */
  comparedTo?: "prior_7d" | "prior_30d" | "prior_week" | "baseline";
};

// -------------------------------------------------------------------------
// Executive insight — extends GeneratedInsight with structured evidence
// -------------------------------------------------------------------------

export type ExecutiveInsight = {
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  confidence: number;
  forDay: string; // ISO YYYY-MM-DD
  metadata: ExecutiveInsightMetadata;
};

export type ExecutiveInsightMetadata = {
  evidence: EvidenceBundle;
  affectedProviders?: ProviderId[];
  affectedCategories?: PromptCategory[];
  recommendedAction?: string;
  /** Priority 0..100 computed by the ranker — stored for fast UI sort. */
  priority?: number;
  isNew?: boolean;
  /** Generator-specific payload goes here. */
  [key: string]: unknown;
};

// -------------------------------------------------------------------------
// Ranked insight — output of the ranker stage
// -------------------------------------------------------------------------

export type RankedInsight = ExecutiveInsight & {
  priority: number; // 0..100
  isNew: boolean;
};

// -------------------------------------------------------------------------
// Executive context — rich aggregation fed to all generators
// -------------------------------------------------------------------------

export type ScoreSnapshot = {
  day: string; // ISO YYYY-MM-DD
  total: number;
  byProvider: Record<string, number>;
  citationRate: number;
  avgRank: number | null;
  sentimentBonus: number;
  confidence: number;
  sampleSize: number;
};

export type CompetitorDayMetric = {
  day: string;
  entity: string;
  mentions: number;
  appearedInRuns: number;
  totalRuns: number;
  shareOfVoice: number;
  avgRank: number | null;
  byProvider: Record<string, number>;
  byCategory: Record<string, number>;
};

export type CitationDayMetric = {
  day: string;
  domain: string;
  count: number;
  authorityScore: number;
  byProvider: Record<string, number>;
  avgRank: number | null;
};

export type LatestRun = {
  provider: ProviderId;
  category: PromptCategory;
  brandMentioned: boolean;
  brandRank: number | null;
  sentimentScore: number | null;
  citationCount: number;
};

export type GeoRecSummary = {
  kind: string;
  category: string;
  title: string;
  priorityScore: number;
  impactScore: number;
};

export type ExecutiveContext = {
  workspaceId: string;
  projectId: string;
  projectDomain: string;
  todayIso: string;

  /** Score snapshots sorted oldest→newest (30d). */
  snapshots: ScoreSnapshot[];
  /** Competitor daily metrics sorted oldest→newest (30d). */
  competitorMetrics: CompetitorDayMetric[];
  /** Citation daily metrics sorted oldest→newest (30d). */
  citationMetrics: CitationDayMetric[];
  /** Runs from the most recently completed scan. */
  latestRuns: LatestRun[];
  /** Top open GEO recommendations by priority. */
  topGeoRecs: GeoRecSummary[];
  /** Set of InsightKind values seen in the last 14 days (for novelty). */
  recentKinds: Set<InsightKind>;
};

// -------------------------------------------------------------------------
// Threat level classification
// -------------------------------------------------------------------------

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const classifyThreat = (sovDelta: number, mentionDelta: number): ThreatLevel => {
  const magnitude = Math.max(Math.abs(sovDelta), Math.abs(mentionDelta));
  if (magnitude >= 30) return "CRITICAL";
  if (magnitude >= 20) return "HIGH";
  if (magnitude >= 10) return "MEDIUM";
  return "LOW";
};
