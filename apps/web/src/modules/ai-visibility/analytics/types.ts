import type { ProviderId } from "@prisma/client";

export type DateRange = "7d" | "30d" | "90d";
export type ProviderFilter = "ALL" | ProviderId;

export type TrendPoint = { date: string; value: number };

export type SentimentPoint = {
  date: string;
  POSITIVE: number;
  NEUTRAL: number;
  NEGATIVE: number;
  MIXED: number;
};

export type ProviderStat = {
  provider: string;
  label: string;
  totalRuns: number;
  mentionRate: number; // 0..1
  avgRank: number | null;
  sentimentAvg: number; // -1..1
  score: number; // 0-100
};

export type MatrixCell = {
  provider: string;
  category: string;
  mentionRate: number; // 0..1
  totalRuns: number;
};

export type CompetitorStat = {
  entity: string;
  count: number;
  share: number; // 0..1
};

export type CitationStat = {
  domain: string;
  count: number;
  share: number; // 0..1
};

export type PromptStat = {
  promptId: string;
  name: string;
  category: string;
  totalRuns: number;
  mentionRate: number;
  avgRank: number | null;
  sentimentAvg: number;
};

export type ScoreBreakdown = {
  total: number;
  byProvider: Partial<Record<ProviderId, number>>;
  breakdown: {
    citationRate: number;
    avgRank: number | null;
    sentimentBonus: number;
    citationCount: number;
  };
};

export type AnalyticsData = {
  latestScore: number | null;
  prevScore: number | null;
  scoreBreakdown: ScoreBreakdown | null;
  totalRuns: number;
  mentionedRuns: number;
  // Trend series — one point per day in the selected range
  scoreTrend: TrendPoint[];
  mentionTrend: TrendPoint[];
  rankingTrend: TrendPoint[];
  sentimentTrend: SentimentPoint[];
  // Breakdowns
  providerStats: ProviderStat[];
  matrixCells: MatrixCell[];
  competitorStats: CompetitorStat[];
  citationStats: CitationStat[];
  promptStats: PromptStat[];
  // Live state
  isAnyScanRunning: boolean;
};
