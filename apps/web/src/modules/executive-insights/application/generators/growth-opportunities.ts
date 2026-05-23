import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { groupBy, mean, pct, linregSlope } from "../math";

/**
 * Growth Opportunity Generator.
 *
 * Surfaces positive signals the brand can amplify:
 * 1. High-sentiment, under-exploited categories (content opportunity).
 * 2. Providers where brand performs well but could dominate more.
 * 3. Citation domains that could anchor a coverage campaign.
 * 4. Positive score momentum to double down on.
 * 5. Competitors appearing on domains the brand isn't cited from yet.
 */
export const generateGrowthOpportunities = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.latestRuns.length === 0) return [];

  const out: ExecutiveInsight[] = [];

  // --- 1. High-sentiment under-exploited category ---
  const categoryInsights = findCategoryOpportunities(ctx);
  out.push(...categoryInsights);

  // --- 2. Positive score momentum ---
  const momentumInsight = findScoreMomentum(ctx);
  if (momentumInsight) out.push(momentumInsight);

  // --- 3. Citation domain opportunity ---
  const citationInsight = findCitationOpportunity(ctx);
  if (citationInsight) out.push(citationInsight);

  // --- 4. Provider headroom ---
  const providerInsights = findProviderHeadroom(ctx);
  out.push(...providerInsights);

  return out;
};

// -------------------------------------------------------------------------

function findCategoryOpportunities(ctx: ExecutiveContext): ExecutiveInsight[] {
  const byCategory = groupBy(ctx.latestRuns, (r) => r.category);
  const out: ExecutiveInsight[] = [];

  for (const [category, runs] of Object.entries(byCategory)) {
    if (runs.length < 2) continue;

    const mentionedRuns = runs.filter((r) => r.brandMentioned);
    const mentionRate = mentionedRuns.length / runs.length;
    const sentimentValues = mentionedRuns
      .filter((r) => r.sentimentScore !== null)
      .map((r) => r.sentimentScore!);
    const avgSentiment = sentimentValues.length ? mean(sentimentValues) : 0;

    // Sweet spot: decent mention rate + strong positive sentiment
    // These categories are worth amplifying because when AI mentions the brand, it's positive
    if (mentionRate >= 0.3 && mentionRate < 0.7 && avgSentiment > 0.25) {
      const catLabel = category.toLowerCase().replace(/_/g, " ");
      out.push({
        kind: "GROWTH_OPPORTUNITY",
        severity: "INFO",
        title: `Amplify ${catLabel} content — strong sentiment, room to grow`,
        body: `In ${catLabel} prompts, your brand is mentioned ${pct(mentionRate * 100)} of the time with positive sentiment (${avgSentiment.toFixed(2)}). The content formula is already working — increasing coverage in this category could push mention rate toward 70–80%.`,
        confidence: Math.min(0.88, 0.5 + runs.length * 0.05),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: [
              { label: "Mention rate", value: pct(mentionRate * 100), highlight: true },
              { label: "Avg sentiment", value: avgSentiment.toFixed(2), highlight: true },
              { label: "Runs analyzed", value: runs.length },
            ],
            windowDays: 1,
            dataPoints: runs.length,
          },
          category,
          mentionRate,
          avgSentiment,
          affectedCategories: [category],
          recommendedAction: `Create more ${catLabel} content targeting the same prompt patterns. Your current approach is resonating — scale it.`,
        },
      });
    }
  }

  return out.slice(0, 2); // Cap at 2 category opportunities per run
}

function findScoreMomentum(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.snapshots.length < 5) return null;

  const recent = ctx.snapshots.slice(-5);
  const xVals = recent.map((_, i) => i);
  const yVals = recent.map((s) => s.total);
  const slope = linregSlope(xVals, yVals);

  // Only emit if there's clear upward momentum
  if (slope < 0.5) return null;

  const start = recent[0].total;
  const end = recent[recent.length - 1].total;
  const change = end - start;
  const changePct = start > 0 ? (change / start) * 100 : 0;

  const avgConfidence = mean(recent.map((s) => s.confidence));
  const highConfidenceDays = recent.filter((s) => s.confidence >= 0.6).length;

  return {
    kind: "GROWTH_OPPORTUNITY",
    severity: "INFO",
    title: `Score momentum: up ${Math.round(change)} points over ${recent.length} days`,
    body: `Your visibility score has trended upward for ${recent.length} consecutive days (+${pct(changePct)}). This momentum is worth accelerating. Investigate what changed — new content, earned coverage, or technical improvements — and do more of it. Double down while you have positive signal.`,
    confidence: Math.min(0.9, 0.5 + highConfidenceDays * 0.08),
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Score change", value: `+${Math.round(change)}`, highlight: true },
          { label: "% change", value: `+${pct(changePct)}`, delta: changePct },
          { label: "Slope (pts/day)", value: slope.toFixed(2) },
          { label: "Avg confidence", value: avgConfidence.toFixed(2) },
        ],
        windowDays: recent.length,
        dataPoints: recent.length,
      },
      slope,
      changePct,
      changeAbsolute: change,
      recommendedAction: "Audit the actions taken in the past week that may have driven this improvement. Identify the highest-leverage activities and prioritize them.",
    },
  };
}

function findCitationOpportunity(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.citationMetrics.length === 0) return null;

  // Find high-authority domains frequently cited across providers
  const todayDate = new Date(ctx.todayIso);
  const last14Start = isoDay(addDays(todayDate, -14));
  const recent = ctx.citationMetrics.filter((m) => m.day >= last14Start);

  // Aggregate by domain
  const domainMap: Record<string, { totalCount: number; auth: number; providers: Set<string> }> = {};
  for (const row of recent) {
    domainMap[row.domain] ??= { totalCount: 0, auth: row.authorityScore, providers: new Set() };
    domainMap[row.domain].totalCount += row.count;
    for (const [p, cnt] of Object.entries(row.byProvider)) {
      if ((cnt as number) > 0) domainMap[row.domain].providers.add(p);
    }
  }

  // Find high-authority, multi-provider domains
  const candidates = Object.entries(domainMap)
    .filter(([, d]) => d.auth >= 0.65 && d.providers.size >= 2 && d.totalCount >= 3)
    .sort((a, b) => b[1].auth * b[1].providers.size - a[1].auth * a[1].providers.size)
    .slice(0, 1);

  if (candidates.length === 0) return null;

  const [domain, data] = candidates[0];

  return {
    kind: "GROWTH_OPPORTUNITY",
    severity: "INFO",
    title: `${domain} is a high-leverage citation target`,
    body: `${domain} (authority: ${data.auth.toFixed(2)}) is being cited by ${data.providers.size} AI providers and appeared ${data.totalCount} times in the last 14 days. Earning a mention or partnership with this source would directly improve your visibility across multiple providers simultaneously.`,
    confidence: 0.72,
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Domain authority", value: data.auth.toFixed(2), highlight: true },
          { label: "Providers citing it", value: data.providers.size },
          { label: "Total citations (14d)", value: data.totalCount },
        ],
        windowDays: 14,
        dataPoints: recent.length,
      },
      targetDomain: domain,
      domainAuthority: data.auth,
      providerCount: data.providers.size,
      recommendedAction: `Research what ${domain} covers in your industry and identify opportunities for guest contributions, data partnerships, or PR outreach.`,
    },
  };
}

function findProviderHeadroom(ctx: ExecutiveContext): ExecutiveInsight[] {
  const byProvider = groupBy(ctx.latestRuns, (r) => r.provider);
  const out: ExecutiveInsight[] = [];

  const PROVIDER_LABEL: Record<string, string> = {
    OPENAI: "ChatGPT",
    ANTHROPIC: "Claude",
    GOOGLE: "Gemini",
    PERPLEXITY: "Perplexity",
  };

  // Find providers with good sentiment but low mention rate (headroom opportunity)
  for (const [provider, runs] of Object.entries(byProvider)) {
    const mentioned = runs.filter((r) => r.brandMentioned);
    const mentionRate = mentioned.length / runs.length;
    const sentiments = mentioned
      .filter((r) => r.sentimentScore !== null)
      .map((r) => r.sentimentScore!);
    const avgSentiment = sentiments.length ? mean(sentiments) : null;

    // Good sentiment but low mention rate = headroom
    if (avgSentiment !== null && avgSentiment > 0.2 && mentionRate >= 0.15 && mentionRate < 0.45) {
      const label = PROVIDER_LABEL[provider] ?? provider;
      out.push({
        kind: "GROWTH_OPPORTUNITY",
        severity: "INFO",
        title: `${label}: positive sentiment but only ${pct(mentionRate * 100)} mention rate — headroom available`,
        body: `When ${label} mentions your brand it does so positively (sentiment: ${avgSentiment.toFixed(2)}), but only ${pct(mentionRate * 100)} of prompts trigger a mention. This gap between quality and quantity suggests the right content targeting could significantly expand coverage without risking negative framing.`,
        confidence: Math.min(0.85, 0.5 + runs.length * 0.04),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: [
              { label: "Mention rate", value: pct(mentionRate * 100), highlight: true },
              { label: "Avg sentiment", value: avgSentiment.toFixed(2), highlight: true },
              { label: "Runs analyzed", value: runs.length },
            ],
            windowDays: 1,
            dataPoints: runs.length,
          },
          provider,
          affectedProviders: [provider],
          mentionRate,
          avgSentiment,
          recommendedAction: `Create more ${label}-optimized content for the prompt categories where you aren't yet appearing.`,
        },
      });
    }
  }

  return out.slice(0, 2);
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
