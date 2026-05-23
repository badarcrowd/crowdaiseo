import type { ProviderId, PromptCategory } from "@prisma/client";
import type {
  Explanation,
  ExplanationReason,
  ScoreChangeSummary,
} from "../domain/types";

// -------------------------------------------------------------------------
// Score Change
// -------------------------------------------------------------------------

/**
 * Explains why the AI visibility score changed between two periods.
 *
 * All reasons are derived directly from the numeric inputs — no inference,
 * no LLM, no probability estimates. The summary is a template filled
 * with actual measured values.
 */
export const explainScoreChange = (change: ScoreChangeSummary): Explanation => {
  const reasons: ExplanationReason[] = [];

  const citationRateDelta = change.currentCitationRate - change.previousCitationRate;
  if (Math.abs(citationRateDelta) >= 0.02) {
    reasons.push({
      label: "Mention rate",
      detail: `Brand mention rate ${citationRateDelta > 0 ? "increased" : "decreased"} from ${pct(change.previousCitationRate)} to ${pct(change.currentCitationRate)} across ${change.currentSampleSize} runs.`,
      metric: pct(change.currentCitationRate),
      direction: citationRateDelta > 0 ? "positive" : "negative",
    });
  }

  const sentimentDelta = change.currentSentiment - change.previousSentiment;
  if (Math.abs(sentimentDelta) >= 0.05) {
    reasons.push({
      label: "Sentiment",
      detail: `Average brand sentiment ${sentimentDelta > 0 ? "improved" : "declined"} from ${round2(change.previousSentiment)} to ${round2(change.currentSentiment)}.`,
      metric: round2(change.currentSentiment),
      direction: sentimentDelta > 0 ? "positive" : "negative",
    });
  }

  if (change.currentAvgRank !== null && change.previousAvgRank !== null) {
    const rankDelta = change.previousAvgRank - change.currentAvgRank;
    if (Math.abs(rankDelta) >= 0.5) {
      reasons.push({
        label: "Rank position",
        detail: `Average rank when mentioned ${rankDelta > 0 ? "improved" : "declined"} from ${round1(change.previousAvgRank)} to ${round1(change.currentAvgRank)}.`,
        metric: round1(change.currentAvgRank),
        direction: rankDelta > 0 ? "positive" : "negative",
      });
    }
  }

  for (const [provider, { current, previous }] of Object.entries(change.byProvider)) {
    const d = current - previous;
    if (Math.abs(d) >= 5) {
      reasons.push({
        label: `${provider} score`,
        detail: `${provider} sub-score ${d > 0 ? "rose" : "fell"} from ${previous} to ${current}.`,
        metric: current,
        direction: d > 0 ? "positive" : "negative",
      });
    }
  }

  if (reasons.length === 0) {
    reasons.push({
      label: "No significant driver",
      detail: `Score changed by ${change.delta > 0 ? "+" : ""}${change.delta} points but no individual component exceeded the minimum change threshold.`,
      metric: change.delta,
      direction: change.delta > 0 ? "positive" : change.delta < 0 ? "negative" : "neutral",
    });
  }

  const dominant = reasons.sort((a, b) => {
    const score = (r: ExplanationReason) =>
      r.direction === "positive" ? 1 : r.direction === "negative" ? -1 : 0;
    return Math.abs(score(b)) - Math.abs(score(a));
  })[0]!;

  const summary =
    change.delta === 0
      ? `Score held steady at ${change.current} (${change.windowDays}d window, ${change.currentSampleSize} runs analyzed).`
      : `Score ${change.delta > 0 ? "increased" : "decreased"} by ${Math.abs(change.delta)} points (${change.previous} → ${change.current}) primarily due to ${dominant.label.toLowerCase()}.`;

  return {
    subject: "SCORE_CHANGE",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Competitor Dominance
// -------------------------------------------------------------------------

export type CompetitorDominanceInput = {
  competitor: string;
  competitorSov: number;
  brandSov: number;
  competitorMentionRate: number;
  brandMentionRate: number;
  dominantCategories: PromptCategory[];
  dominantProviders: ProviderId[];
  totalRunsAnalyzed: number;
};

/**
 * Explains why a competitor outperforms the brand in AI search results.
 */
export const explainCompetitorDominance = (
  input: CompetitorDominanceInput,
): Explanation => {
  const reasons: ExplanationReason[] = [];
  const sovGap = input.competitorSov - input.brandSov;
  const mentionGap = input.competitorMentionRate - input.brandMentionRate;

  reasons.push({
    label: "Share of voice gap",
    detail: `${input.competitor} holds ${pct(input.competitorSov / 100)} share of voice vs your ${pct(input.brandSov / 100)} across ${input.totalRunsAnalyzed} runs — a gap of ${round1(sovGap)} pp.`,
    metric: round1(sovGap),
    direction: "negative",
  });

  if (mentionGap > 0.05) {
    reasons.push({
      label: "Mention rate gap",
      detail: `${input.competitor} is mentioned in ${pct(input.competitorMentionRate)} of runs vs your ${pct(input.brandMentionRate)}.`,
      metric: pct(input.brandMentionRate),
      direction: "negative",
    });
  }

  if (input.dominantCategories.length > 0) {
    reasons.push({
      label: "Category dominance",
      detail: `${input.competitor} outperforms in: ${input.dominantCategories.join(", ")}. These are prompt categories where your brand is underrepresented.`,
      metric: input.dominantCategories.length,
      direction: "negative",
    });
  }

  if (input.dominantProviders.length > 0) {
    reasons.push({
      label: "Provider dominance",
      detail: `${input.competitor} leads on: ${input.dominantProviders.join(", ")}. Your brand has weaker presence on these AI providers.`,
      metric: input.dominantProviders.length,
      direction: "negative",
    });
  }

  const summary = `${input.competitor} dominates with ${pct(input.competitorSov / 100)} share of voice (your brand: ${pct(input.brandSov / 100)}) across ${input.totalRunsAnalyzed} analyzed runs${input.dominantCategories.length > 0 ? `, particularly in ${input.dominantCategories.slice(0, 2).join(" and ")} prompts` : ""}.`;

  return {
    subject: "COMPETITOR_DOMINANCE",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Insight Generation
// -------------------------------------------------------------------------

export type InsightExplanationInput = {
  insightKind: string;
  title: string;
  evidenceItems: Array<{ label: string; value: number | string; delta?: number }>;
  dataPoints: number;
  windowDays: number;
};

/**
 * Explains why a specific insight was generated — which evidence triggered it.
 */
export const explainInsight = (input: InsightExplanationInput): Explanation => {
  const reasons: ExplanationReason[] = input.evidenceItems.map((item) => ({
    label: item.label,
    detail: `Measured value: ${item.value}${item.delta !== undefined ? ` (${item.delta >= 0 ? "+" : ""}${item.delta} vs prior period)` : ""}.`,
    metric: item.value,
    direction:
      item.delta === undefined
        ? "neutral"
        : item.delta > 0
          ? "positive"
          : item.delta < 0
            ? "negative"
            : "neutral",
  }));

  const summary = `This insight was generated from ${input.dataPoints} data points over a ${input.windowDays}-day window. The trigger was: "${input.title}".`;

  return {
    subject: "INSIGHT_GENERATED",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Recommendation Existence
// -------------------------------------------------------------------------

export type RecommendationExplanationInput = {
  kind: string;
  title: string;
  impactScore: number;
  confidence: number;
  evidenceItems: Array<{ label: string; value: number | string }>;
};

/**
 * Explains why a GEO recommendation was surfaced.
 */
export const explainRecommendation = (input: RecommendationExplanationInput): Explanation => {
  const reasons: ExplanationReason[] = [
    {
      label: "Impact estimate",
      detail: `Estimated visibility impact score: ${input.impactScore}/100. Higher impact recommendations are surfaced first.`,
      metric: input.impactScore,
      direction: "positive",
    },
    {
      label: "Evidence confidence",
      detail: `Recommendation confidence: ${pct(input.confidence)}. Based on ${input.evidenceItems.length} evidence signal${input.evidenceItems.length !== 1 ? "s" : ""}.`,
      metric: pct(input.confidence),
      direction: input.confidence >= 0.6 ? "positive" : "neutral",
    },
    ...input.evidenceItems.map((item) => ({
      label: item.label,
      detail: `Observed value: ${item.value}.`,
      metric: item.value,
      direction: "neutral" as const,
    })),
  ];

  const summary = `This recommendation exists because ${input.title.toLowerCase()} — with an estimated impact of ${input.impactScore}/100 and ${pct(input.confidence)} data confidence.`;

  return {
    subject: "RECOMMENDATION_EXISTS",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Trend Direction
// -------------------------------------------------------------------------

export type TrendExplanationInput = {
  metric: string;
  direction: "up" | "down" | "flat";
  pctChange: number;
  slope: number;
  windowDays: number;
  latestValue: number;
  baselineValue: number;
  sampleSize: number;
  isAnomaly: boolean;
  latestZ?: number;
};

/**
 * Explains the observed direction and magnitude of a trend.
 */
export const explainTrend = (input: TrendExplanationInput): Explanation => {
  const reasons: ExplanationReason[] = [
    {
      label: "Period-over-period change",
      detail: `${input.metric} changed ${input.pctChange >= 0 ? "+" : ""}${round1(input.pctChange)}% vs the prior equal-length window (${input.windowDays / 2} days each).`,
      metric: `${input.pctChange >= 0 ? "+" : ""}${round1(input.pctChange)}%`,
      direction: input.pctChange > 0 ? "positive" : input.pctChange < 0 ? "negative" : "neutral",
    },
    {
      label: "Linear trend slope",
      detail: `Slope: ${round3(input.slope)} units/day over ${input.windowDays} days. ${Math.abs(input.slope) < 0.05 ? "This is within the flat-trend threshold." : "A consistent directional movement."}`,
      metric: round3(input.slope),
      direction: input.slope > 0.05 ? "positive" : input.slope < -0.05 ? "negative" : "neutral",
    },
    {
      label: "Absolute change",
      detail: `From ${round1(input.baselineValue)} to ${round1(input.latestValue)} over ${input.windowDays} days (${input.sampleSize} data points).`,
      metric: round1(input.latestValue - input.baselineValue),
      direction:
        input.latestValue > input.baselineValue
          ? "positive"
          : input.latestValue < input.baselineValue
            ? "negative"
            : "neutral",
    },
  ];

  if (input.isAnomaly && input.latestZ !== undefined) {
    reasons.push({
      label: "Statistical anomaly",
      detail: `The latest data point has a z-score of ${round2(input.latestZ)}, which exceeds the anomaly threshold of ±2. This indicates an unusually large deviation from the recent baseline.`,
      metric: round2(input.latestZ),
      direction: input.latestZ > 0 ? "positive" : "negative",
    });
  }

  const directionWord =
    input.direction === "up" ? "upward" : input.direction === "down" ? "downward" : "flat";
  const summary = `${input.metric} is trending ${directionWord} at ${round1(Math.abs(input.pctChange))}% change over ${input.windowDays} days${input.isAnomaly ? " — the latest point is a statistical anomaly" : ""}.`;

  return {
    subject: "TREND_DIRECTION",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Provider Profile
// -------------------------------------------------------------------------

export type ProviderProfileExplanationInput = {
  provider: ProviderId;
  mentionRate: number;
  avgRank: number | null;
  volatility: number;
  citationDiversity: number;
  totalRuns: number;
  characterization: string;
};

/**
 * Explains why a provider received its profile / characterization.
 */
export const explainProviderProfile = (input: ProviderProfileExplanationInput): Explanation => {
  const reasons: ExplanationReason[] = [
    {
      label: "Brand mention rate",
      detail: `${input.provider} mentioned your brand in ${pct(input.mentionRate)} of ${input.totalRuns} runs analyzed.`,
      metric: pct(input.mentionRate),
      direction: input.mentionRate >= 0.5 ? "positive" : input.mentionRate >= 0.25 ? "neutral" : "negative",
    },
  ];

  if (input.avgRank !== null) {
    reasons.push({
      label: "Average brand rank",
      detail: `When mentioned, your brand appears at position ${round1(input.avgRank)} on average.`,
      metric: round1(input.avgRank),
      direction: input.avgRank <= 2 ? "positive" : input.avgRank <= 4 ? "neutral" : "negative",
    });
  }

  reasons.push(
    {
      label: "Score volatility",
      detail: `Provider volatility: ${round2(input.volatility * 100)}%. ${input.volatility < 0.2 ? "Highly stable and predictable." : input.volatility < 0.5 ? "Moderate variance across scan periods." : "High variance — scores fluctuate significantly."}`,
      metric: round2(input.volatility * 100) + "%",
      direction: input.volatility < 0.2 ? "positive" : input.volatility > 0.5 ? "negative" : "neutral",
    },
    {
      label: "Citation diversity",
      detail: `Cites ${round2(input.citationDiversity * 100)}% unique domains relative to total citations.`,
      metric: round2(input.citationDiversity * 100) + "%",
      direction: input.citationDiversity > 0.6 ? "positive" : "neutral",
    },
  );

  const summary = `${input.provider} profile is based on ${input.totalRuns} runs: ${input.characterization}`;

  return {
    subject: "PROVIDER_PROFILE",
    summary,
    reasons,
    evidenceBacked: true,
  };
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const pct = (r: number) => `${Math.round(r * 100)}%`;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
