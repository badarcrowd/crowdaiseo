import "server-only";
import { prisma } from "@/lib/prisma/client";
import type { ProviderId, PromptCategory } from "@prisma/client";
import type {
  MarketMapData,
  ProviderProfile,
  DomainType,
  ProviderScores,
  ProviderRaw,
} from "../domain/types";
import { PROVIDER_LABEL } from "@/modules/ai-visibility/presentation/labels";

const PROVIDER_COLORS: Record<ProviderId, string> = {
  OPENAI: "hsl(var(--chart-1))",
  ANTHROPIC: "hsl(var(--chart-2))",
  GOOGLE: "hsl(var(--chart-3))",
  PERPLEXITY: "hsl(var(--chart-4))",
};

const ALL_PROVIDERS: ProviderId[] = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"];

export function classifyDomain(domain: string): DomainType {
  const d = domain.toLowerCase();
  if (
    d.includes("reddit.com") ||
    d.includes("quora.com") ||
    d.includes("stackoverflow.com") ||
    d.includes("stackexchange.com") ||
    d.includes("forum") ||
    d.includes("community")
  )
    return "Community";
  if (
    d.endsWith(".edu") ||
    d.endsWith(".gov") ||
    d.includes("wikipedia.org") ||
    d.includes("scholar.google") ||
    d.includes("pubmed") ||
    d.includes("ncbi.nlm")
  )
    return "Authority";
  if (
    d.startsWith("docs.") ||
    d.includes(".docs.") ||
    d.startsWith("developer.") ||
    d.startsWith("developers.") ||
    d.startsWith("api.") ||
    d.includes("/docs") ||
    d.includes("documentation") ||
    d.includes("devdocs")
  )
    return "Documentation";
  if (
    d.includes("medium.com") ||
    d.includes("substack.com") ||
    d.includes("beehiiv.com") ||
    d.includes(".blog.") ||
    d.startsWith("blog.") ||
    d.endsWith(".blog") ||
    d.includes("hashnode") ||
    d.includes("dev.to")
  )
    return "Blog";
  if (
    d.includes("techcrunch") ||
    d.includes("reuters.com") ||
    d.includes("bloomberg.com") ||
    d.includes("wsj.com") ||
    d.includes("nytimes.com") ||
    d.includes("theverge") ||
    d.includes("wired.com") ||
    d.includes("zdnet") ||
    d.includes("news") ||
    d.includes("herald") ||
    d.includes("times.com")
  )
    return "News";
  return "Web";
}

function buildCharacterization(
  displayName: string,
  scores: ProviderScores,
  raw: ProviderRaw,
): string {
  const traits: string[] = [];
  if (scores.authorityPreference > 60) traits.push("authoritative & official sources");
  if (scores.communityReliance > 50) traits.push("community forums");
  if (scores.documentationAffinity > 55) traits.push("technical documentation");
  if (scores.citationDensity > 65) traits.push("dense citation patterns");

  const topTrait = traits[0] ?? "diverse web sources";
  const sentiment =
    raw.avgSentiment > 0.2 ? "positive" : raw.avgSentiment < -0.1 ? "cautious" : "neutral";
  const stability =
    scores.rankStability > 70 ? "stable" : scores.rankStability < 40 ? "volatile" : "moderate";

  return `${displayName} favors ${topTrait}, shows ${sentiment} brand sentiment, and delivers ${stability} rankings at ${Math.round(raw.mentionRate * 100)}% mention reliability.`;
}

export async function buildMarketMap(
  workspaceId: string,
  projectId: string,
  days = 30,
): Promise<MarketMapData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [promptRuns, citationMetrics, volatilityMetrics] = await Promise.all([
    prisma.promptRun.findMany({
      where: {
        workspaceId,
        status: "COMPLETED",
        createdAt: { gte: since },
        prompt: { projectId },
      },
      select: {
        provider: true,
        brandMentioned: true,
        brandRank: true,
        sentimentScore: true,
        prompt: { select: { category: true } },
      },
    }),
    prisma.citationDailyMetric.findMany({
      where: { workspaceId, projectId, day: { gte: since } },
      select: {
        domain: true,
        count: true,
        authorityScore: true,
        byProvider: true,
      },
    }),
    prisma.providerVolatilityMetric.findMany({
      where: { workspaceId, projectId, day: { gte: since } },
      select: { provider: true, volatility: true, rankStability: true },
    }),
  ]);

  // ── Per-provider aggregation maps ──────────────────────────────────────────

  type RunAgg = {
    totalRuns: number;
    mentionedRuns: number;
    rankSum: number;
    rankCount: number;
    sentimentSum: number;
    sentimentCount: number;
    categoryMap: Map<PromptCategory, { mentioned: number; total: number }>;
  };

  const runsByProvider = new Map<ProviderId, RunAgg>();
  for (const p of ALL_PROVIDERS) {
    runsByProvider.set(p, {
      totalRuns: 0,
      mentionedRuns: 0,
      rankSum: 0,
      rankCount: 0,
      sentimentSum: 0,
      sentimentCount: 0,
      categoryMap: new Map(),
    });
  }

  for (const run of promptRuns) {
    const agg = runsByProvider.get(run.provider);
    if (!agg) continue;
    agg.totalRuns++;
    if (run.brandMentioned) agg.mentionedRuns++;
    if (run.brandRank !== null) {
      agg.rankSum += run.brandRank;
      agg.rankCount++;
    }
    if (run.sentimentScore !== null) {
      agg.sentimentSum += run.sentimentScore;
      agg.sentimentCount++;
    }
    const cat = run.prompt.category as PromptCategory;
    const cs = agg.categoryMap.get(cat) ?? { mentioned: 0, total: 0 };
    cs.total++;
    if (run.brandMentioned) cs.mentioned++;
    agg.categoryMap.set(cat, cs);
  }

  // ── Per-provider citation aggregation ─────────────────────────────────────

  type CitAgg = {
    domainTypeMap: Map<DomainType, number>;
    domainMap: Map<string, { count: number; authoritySum: number; authorityCount: number }>;
    totalCount: number;
    authorityWeightedSum: number;
    authorityWeightCount: number;
  };

  const citByProvider = new Map<string, CitAgg>();
  for (const metric of citationMetrics) {
    const bp = (metric.byProvider as Record<string, number>) ?? {};
    for (const [provider, count] of Object.entries(bp)) {
      if (count <= 0) continue;
      if (!citByProvider.has(provider)) {
        citByProvider.set(provider, {
          domainTypeMap: new Map(),
          domainMap: new Map(),
          totalCount: 0,
          authorityWeightedSum: 0,
          authorityWeightCount: 0,
        });
      }
      const agg = citByProvider.get(provider)!;
      const dtype = classifyDomain(metric.domain);
      agg.domainTypeMap.set(dtype, (agg.domainTypeMap.get(dtype) ?? 0) + count);
      const existing = agg.domainMap.get(metric.domain);
      if (existing) {
        existing.count += count;
        existing.authoritySum += metric.authorityScore * count;
        existing.authorityCount += count;
      } else {
        agg.domainMap.set(metric.domain, {
          count,
          authoritySum: metric.authorityScore * count,
          authorityCount: count,
        });
      }
      agg.totalCount += count;
      if (metric.authorityScore > 0) {
        agg.authorityWeightedSum += metric.authorityScore * count;
        agg.authorityWeightCount += count;
      }
    }
  }

  // ── Per-provider volatility ────────────────────────────────────────────────

  const volByProvider = new Map<string, { volSum: number; stabSum: number; count: number }>();
  for (const v of volatilityMetrics) {
    const agg = volByProvider.get(v.provider) ?? { volSum: 0, stabSum: 0, count: 0 };
    agg.volSum += v.volatility;
    agg.stabSum += v.rankStability;
    agg.count++;
    volByProvider.set(v.provider, agg);
  }

  // ── Build profiles ─────────────────────────────────────────────────────────

  const profiles: ProviderProfile[] = ALL_PROVIDERS.map((provider) => {
    const runs = runsByProvider.get(provider)!;
    const cit = citByProvider.get(provider);
    const vol = volByProvider.get(provider);

    // Raw
    const mentionRate = runs.totalRuns > 0 ? runs.mentionedRuns / runs.totalRuns : 0;
    const avgBrandRank = runs.rankCount > 0 ? runs.rankSum / runs.rankCount : null;
    const avgSentiment = runs.sentimentCount > 0 ? runs.sentimentSum / runs.sentimentCount : 0;
    const avgDomainAuthority =
      cit && cit.authorityWeightCount > 0
        ? cit.authorityWeightedSum / cit.authorityWeightCount
        : 0;
    const avgVolatility = vol && vol.count > 0 ? (vol.volSum / vol.count) * 100 : 0;
    const avgRankStability = vol && vol.count > 0 ? (vol.stabSum / vol.count) * 100 : 50;

    // Citation rate approximation: (total citations) / (totalRuns * avg expected per run)
    const totalCitCount = cit?.totalCount ?? 0;
    const citationRate =
      runs.totalRuns > 0 ? Math.min(1, totalCitCount / Math.max(1, runs.totalRuns * 2)) : 0;

    const raw: ProviderRaw = {
      mentionRate,
      avgBrandRank,
      avgSentiment,
      citationRate,
      avgDomainAuthority,
      volatility: avgVolatility,
      totalRuns: runs.totalRuns,
    };

    // Citation domain type shares
    const citationsByDomainType: Partial<Record<DomainType, number>> = {};
    if (cit && cit.totalCount > 0) {
      for (const [dtype, count] of cit.domainTypeMap.entries()) {
        citationsByDomainType[dtype] = count / cit.totalCount;
      }
    }

    // Top domains
    const topDomains = cit
      ? [...cit.domainMap.entries()]
          .map(([domain, { count, authoritySum, authorityCount }]) => ({
            domain,
            count,
            authority: authorityCount > 0 ? authoritySum / authorityCount : 0,
            type: classifyDomain(domain),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      : [];

    // Category strengths
    const categoryStrengths: Partial<Record<PromptCategory, number>> = {};
    for (const [cat, { mentioned, total }] of runs.categoryMap.entries()) {
      if (total > 0) categoryStrengths[cat] = mentioned / total;
    }

    // Domain type shares for scoring
    const total = cit?.totalCount ?? 1;
    const authorityCount =
      ((cit?.domainTypeMap.get("Authority") ?? 0) + (cit?.domainTypeMap.get("Documentation") ?? 0)) /
      total;
    const communityCount = (cit?.domainTypeMap.get("Community") ?? 0) / total;
    const docCount = (cit?.domainTypeMap.get("Documentation") ?? 0) / total;

    // Category consistency: lower std-dev → higher score
    const catRates = Object.values(categoryStrengths).filter((v): v is number => v !== undefined);
    let categoryConsistency = 50;
    if (catRates.length > 1) {
      const mean = catRates.reduce((sum, v) => sum + v, 0) / catRates.length;
      const variance =
        catRates.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / catRates.length;
      categoryConsistency = Math.round(Math.max(0, 100 - Math.sqrt(variance) * 200));
    }

    const scores: ProviderScores = {
      citationDensity: Math.round(Math.min(100, citationRate * 120)),
      authorityPreference: Math.round(Math.min(100, authorityCount * 180)),
      communityReliance: Math.round(Math.min(100, communityCount * 300)),
      documentationAffinity: Math.round(Math.min(100, docCount * 300)),
      categoryConsistency,
      sentimentPositivity: Math.round(((avgSentiment + 1) / 2) * 100),
      rankStability: Math.round(Math.max(0, avgRankStability)),
      mentionReliability: Math.round(mentionRate * 100),
    };

    const displayName = PROVIDER_LABEL[provider] ?? provider;
    const color = PROVIDER_COLORS[provider] ?? "hsl(var(--muted-foreground))";
    return {
      provider,
      displayName,
      color,
      scores,
      raw,
      categoryStrengths,
      citationsByDomainType,
      topDomains,
      characterization: buildCharacterization(displayName, scores, raw),
    };
  });

  // ── Cross-provider insights ────────────────────────────────────────────────

  const crossProviderInsights: string[] = [];

  const byMention = [...profiles].sort(
    (a, b) => b.scores.mentionReliability - a.scores.mentionReliability,
  );
  if (byMention[0] && byMention[0].scores.mentionReliability > 0) {
    crossProviderInsights.push(
      `${byMention[0].displayName} shows the highest brand mention reliability (${byMention[0].scores.mentionReliability}%), making it the most consistent recommender.`,
    );
  }

  const byCitation = [...profiles].sort(
    (a, b) => b.scores.citationDensity - a.scores.citationDensity,
  );
  if (byCitation[0] && byCitation[0].scores.citationDensity > 0) {
    crossProviderInsights.push(
      `${byCitation[0].displayName} cites sources most densely — critical for establishing content authority signals.`,
    );
  }

  const byStability = [...profiles].sort(
    (a, b) => b.scores.rankStability - a.scores.rankStability,
  );
  if (byStability[0] && byStability[0].scores.rankStability > 0) {
    crossProviderInsights.push(
      `${byStability[0].displayName} delivers the most stable brand rankings (lowest volatility) over the analysis window.`,
    );
  }

  const byAuthority = [...profiles].sort(
    (a, b) => b.scores.authorityPreference - a.scores.authorityPreference,
  );
  if (byAuthority[0] && byAuthority[0].scores.authorityPreference > 0) {
    crossProviderInsights.push(
      `${byAuthority[0].displayName} has the strongest preference for authoritative domains — optimize for official documentation and .edu/.gov references.`,
    );
  }

  return {
    providers: profiles,
    crossProviderInsights,
    computedAt: new Date().toISOString(),
    dataWindow: days,
    totalRunsAnalyzed: promptRuns.length,
  };
}
