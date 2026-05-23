import type { PromptCategory } from "@prisma/client";
import type { ExecutiveContext, ExecutiveInsight, LatestRun } from "../../domain/types";
import { groupBy, mean, pct } from "../math";

const WEAK_MENTION_THRESHOLD = 0.2; // <20% mention rate = weak spot
const STRONG_MENTION_THRESHOLD = 0.6; // >60% mention rate = strong
const SENTIMENT_SHIFT_THRESHOLD = 0.15; // 0.15 point change = meaningful

const CATEGORY_LABELS: Record<string, string> = {
  COMMERCIAL: "commercial intent",
  INFORMATIONAL: "informational",
  LOCAL_SEO: "local SEO",
  BRAND: "brand",
  COMPARISON: "comparison/alternatives",
  TRANSACTIONAL: "transactional",
};

/**
 * AI Perception Generator.
 *
 * Analyzes how AI models perceive and frame the brand across:
 *   - Prompt categories (intent types)
 *   - Provider-specific sentiment patterns
 *   - Mention rate gaps (appearing vs not appearing)
 *   - Cross-provider sentiment divergence
 *
 * Emits: CATEGORY_WEAK_SPOT, SENTIMENT_SHIFT, AI_PERCEPTION_POSITIVE,
 *        AI_PERCEPTION_NEGATIVE
 */
export const generateAiPerception = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.latestRuns.length === 0) return [];

  const out: ExecutiveInsight[] = [];
  const runs = ctx.latestRuns;
  const total = runs.length;

  // ----- Category analysis -----
  const byCategory = groupBy(runs, (r) => r.category);
  const categoryInsights = analyzeCategoryGaps(byCategory, total, ctx.todayIso);
  out.push(...categoryInsights);

  // ----- Provider sentiment analysis -----
  const byProvider = groupBy(runs, (r) => r.provider);
  const sentimentInsights = analyzeProviderSentiment(byProvider, ctx);
  out.push(...sentimentInsights);

  // ----- Cross-provider divergence -----
  const divergenceInsight = analyzeSentimentDivergence(byProvider, ctx.todayIso);
  if (divergenceInsight) out.push(divergenceInsight);

  // ----- Overall perception -----
  const overallInsight = analyzeOverallPerception(runs, ctx.todayIso);
  if (overallInsight) out.push(overallInsight);

  return out;
};

// -------------------------------------------------------------------------
// Category gap detection
// -------------------------------------------------------------------------

function analyzeCategoryGaps(
  byCategory: Record<string, LatestRun[]>,
  total: number,
  todayIso: string,
): ExecutiveInsight[] {
  const out: ExecutiveInsight[] = [];

  for (const [category, runs] of Object.entries(byCategory)) {
    if (runs.length < 2) continue;

    const mentionRate = runs.filter((r) => r.brandMentioned).length / runs.length;
    const avgSentiment = mean(
      runs.filter((r) => r.sentimentScore !== null).map((r) => r.sentimentScore!),
    );
    const catLabel = CATEGORY_LABELS[category] ?? category.toLowerCase();

    if (mentionRate < WEAK_MENTION_THRESHOLD && runs.length >= 2) {
      const confidence = Math.min(0.9, 0.4 + runs.length * 0.05);
      out.push({
        kind: "CATEGORY_WEAK_SPOT",
        severity: mentionRate === 0 ? "CRITICAL" : "ATTENTION",
        title: `Absent from ${catLabel} AI queries`,
        body: `Your brand appeared in only ${pct(mentionRate * 100)} of ${catLabel} prompts. AI models either don't associate you with this intent type or your content signals aren't strong enough to trigger a mention. This represents a structural visibility gap.`,
        confidence,
        forDay: todayIso,
        metadata: {
          evidence: {
            items: [
              {
                label: "Mention rate",
                value: pct(mentionRate * 100),
                highlight: true,
              },
              { label: "Runs analyzed", value: runs.length },
              ...(avgSentiment !== 0
                ? [{ label: "Avg sentiment when mentioned", value: avgSentiment.toFixed(2) }]
                : []),
            ],
            windowDays: 1,
            dataPoints: runs.length,
          },
          category,
          mentionRate,
          affectedCategories: [category],
          recommendedAction: `Create authoritative ${catLabel} content that directly answers the prompts your AI models are responding to.`,
        },
      });
    }
  }

  return out;
}

// -------------------------------------------------------------------------
// Provider sentiment analysis
// -------------------------------------------------------------------------

function analyzeProviderSentiment(
  byProvider: Record<string, LatestRun[]>,
  ctx: ExecutiveContext,
): ExecutiveInsight[] {
  const out: ExecutiveInsight[] = [];

  for (const [provider, runs] of Object.entries(byProvider)) {
    const mentionedRuns = runs.filter((r) => r.brandMentioned);
    if (mentionedRuns.length < 2) continue;

    const sentimentValues = mentionedRuns
      .filter((r) => r.sentimentScore !== null)
      .map((r) => r.sentimentScore!);
    if (sentimentValues.length === 0) continue;

    const avgSentiment = mean(sentimentValues);
    const mentionRate = mentionedRuns.length / runs.length;

    // Compare to recent snapshot sentiment trend for this provider
    const recentSnapshots = ctx.snapshots.slice(-7);
    const providerScores = recentSnapshots
      .map((s) => s.byProvider[provider])
      .filter((v): v is number => v !== undefined);
    const prevScore = providerScores.length >= 2
      ? mean(providerScores.slice(0, -1))
      : null;
    const latestScore = providerScores.at(-1) ?? null;

    const scoreDelta =
      prevScore !== null && latestScore !== null && prevScore > 0
        ? ((latestScore - prevScore) / prevScore) * 100
        : null;

    // Negative sentiment signal
    if (avgSentiment < -0.1 && mentionRate >= 0.3) {
      out.push({
        kind: "AI_PERCEPTION_NEGATIVE",
        severity: avgSentiment < -0.3 ? "CRITICAL" : "ATTENTION",
        title: `${PROVIDER_LABEL[provider] ?? provider} mentions your brand negatively`,
        body: `When ${PROVIDER_LABEL[provider] ?? provider} mentions your brand, sentiment skews negative (avg: ${avgSentiment.toFixed(2)}). This can suppress future mentions as models learn from user feedback. Investigate which prompts are generating critical framing.`,
        confidence: Math.min(0.88, 0.5 + sentimentValues.length * 0.04),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: [
              { label: "Avg sentiment", value: avgSentiment.toFixed(2), highlight: true },
              { label: "Mention rate", value: pct(mentionRate * 100) },
              ...(scoreDelta !== null
                ? [{ label: "Score delta vs prior", value: `${scoreDelta > 0 ? "+" : ""}${Math.round(scoreDelta)}%`, delta: scoreDelta }]
                : []),
            ],
            windowDays: 1,
            dataPoints: sentimentValues.length,
          },
          provider,
          avgSentiment,
          mentionRate,
          affectedProviders: [provider],
          recommendedAction: "Review which content and sources this provider is using. Address factual inaccuracies or outdated information that may be driving negative framing.",
        },
      });
    }

    // Positive sentiment signal
    if (avgSentiment > 0.3 && mentionRate >= STRONG_MENTION_THRESHOLD) {
      out.push({
        kind: "AI_PERCEPTION_POSITIVE",
        severity: "INFO",
        title: `Strong positive framing on ${PROVIDER_LABEL[provider] ?? provider}`,
        body: `${PROVIDER_LABEL[provider] ?? provider} mentions your brand in ${pct(mentionRate * 100)} of relevant prompts with positive sentiment (avg: ${avgSentiment.toFixed(2)}). This is a competitive advantage — these content patterns should be replicated across other providers.`,
        confidence: Math.min(0.9, 0.5 + mentionedRuns.length * 0.04),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: [
              { label: "Mention rate", value: pct(mentionRate * 100), highlight: true },
              { label: "Avg sentiment", value: avgSentiment.toFixed(2) },
            ],
            windowDays: 1,
            dataPoints: mentionedRuns.length,
          },
          provider,
          avgSentiment,
          mentionRate,
          affectedProviders: [provider],
          recommendedAction: "Identify what content or citations are driving the positive framing and create similar content for other providers.",
        },
      });
    }
  }

  return out;
}

// -------------------------------------------------------------------------
// Cross-provider sentiment divergence
// -------------------------------------------------------------------------

function analyzeSentimentDivergence(
  byProvider: Record<string, LatestRun[]>,
  todayIso: string,
): ExecutiveInsight | null {
  const providerSentiments: Array<{ provider: string; sentiment: number; runs: number }> = [];

  for (const [provider, runs] of Object.entries(byProvider)) {
    const sentiments = runs
      .filter((r) => r.brandMentioned && r.sentimentScore !== null)
      .map((r) => r.sentimentScore!);
    if (sentiments.length < 2) continue;
    providerSentiments.push({
      provider,
      sentiment: mean(sentiments),
      runs: sentiments.length,
    });
  }

  if (providerSentiments.length < 2) return null;

  const max = Math.max(...providerSentiments.map((p) => p.sentiment));
  const min = Math.min(...providerSentiments.map((p) => p.sentiment));
  const divergence = max - min;

  if (divergence < SENTIMENT_SHIFT_THRESHOLD * 2) return null;

  const bestProvider = providerSentiments.find((p) => p.sentiment === max)!;
  const worstProvider = providerSentiments.find((p) => p.sentiment === min)!;

  return {
    kind: "SENTIMENT_SHIFT",
    severity: divergence > 0.5 ? "ATTENTION" : "INFO",
    title: `Sentiment gap: ${PROVIDER_LABEL[bestProvider.provider] ?? bestProvider.provider} positive, ${PROVIDER_LABEL[worstProvider.provider] ?? worstProvider.provider} critical`,
    body: `There is a ${divergence.toFixed(2)}-point sentiment divergence across AI providers. ${PROVIDER_LABEL[bestProvider.provider] ?? bestProvider.provider} (${bestProvider.sentiment.toFixed(2)}) frames your brand very differently from ${PROVIDER_LABEL[worstProvider.provider] ?? worstProvider.provider} (${worstProvider.sentiment.toFixed(2)}). This suggests provider-specific content or citation gaps.`,
    confidence: 0.7,
    forDay: todayIso,
    metadata: {
      evidence: {
        items: providerSentiments.map((p) => ({
          label: PROVIDER_LABEL[p.provider] ?? p.provider,
          value: p.sentiment.toFixed(2),
          highlight: p.provider === bestProvider.provider || p.provider === worstProvider.provider,
        })),
        windowDays: 1,
        dataPoints: providerSentiments.reduce((s, p) => s + p.runs, 0),
      },
      divergence,
      bestProvider: bestProvider.provider,
      worstProvider: worstProvider.provider,
      affectedProviders: providerSentiments.map((p) => p.provider),
      recommendedAction: `Investigate why ${PROVIDER_LABEL[worstProvider.provider] ?? worstProvider.provider} has lower sentiment. Examine which sources it cites vs ${PROVIDER_LABEL[bestProvider.provider] ?? bestProvider.provider}.`,
    },
  };
}

// -------------------------------------------------------------------------
// Overall perception health
// -------------------------------------------------------------------------

function analyzeOverallPerception(
  runs: LatestRun[],
  todayIso: string,
): ExecutiveInsight | null {
  const mentionedRuns = runs.filter((r) => r.brandMentioned);
  const overallMentionRate = mentionedRuns.length / runs.length;

  if (overallMentionRate >= 0.5) return null; // Only surface if coverage is low

  const brandRuns = mentionedRuns.filter((r) => r.brandRank !== null);
  const avgRank = brandRuns.length
    ? mean(brandRuns.map((r) => r.brandRank!))
    : null;

  return {
    kind: "AI_PERCEPTION_NEGATIVE",
    severity: overallMentionRate < 0.1 ? "CRITICAL" : "ATTENTION",
    title: `Brand present in only ${pct(overallMentionRate * 100)} of AI responses`,
    body: `Your brand is mentioned in ${pct(overallMentionRate * 100)} of AI model responses across all tested prompts${avgRank ? ` (avg rank: ${avgRank.toFixed(1)} when mentioned)` : ""}. AI models primarily respond without referencing your brand — meaning your competitors capture that mindshare instead.`,
    confidence: Math.min(0.92, 0.5 + runs.length * 0.01),
    forDay: todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Overall mention rate", value: pct(overallMentionRate * 100), highlight: true },
          { label: "Total runs", value: runs.length },
          ...(avgRank !== null ? [{ label: "Avg rank when mentioned", value: avgRank.toFixed(1) }] : []),
        ],
        windowDays: 1,
        dataPoints: runs.length,
      },
      mentionRate: overallMentionRate,
      avgRank,
      recommendedAction: "Audit your GEO recommendations and prioritize actions that increase brand mention rate in the weakest prompt categories.",
    },
  };
}

const PROVIDER_LABEL: Record<string, string> = {
  OPENAI: "ChatGPT",
  ANTHROPIC: "Claude",
  GOOGLE: "Gemini",
  PERPLEXITY: "Perplexity",
};
