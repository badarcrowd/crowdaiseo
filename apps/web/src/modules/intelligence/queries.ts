import "server-only";
import { prisma } from "@/lib/prisma/client";
import { executiveInsightQueries } from "@/modules/executive-insights/application/queries";
import { geoQueries } from "@/modules/geo/application/queries";
import { fetchAnalytics } from "@/modules/ai-visibility/analytics/queries";

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence Centre — unified read queries
// Each function is independently cacheable via Next.js fetch semantics.
// ─────────────────────────────────────────────────────────────────────────────

export type IntelligenceProject = {
  id: string;
  name: string;
  domain: string;
  workspaceId: string;
};

export async function getIntelligenceProject(
  workspaceId: string,
  projectId?: string,
): Promise<IntelligenceProject | null> {
  const project = await prisma.project.findFirst({
    where: {
      workspaceId,
      deletedAt: null,
      ...(projectId ? { id: projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, domain: true, workspaceId: true },
  });
  return project;
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive Summary
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutiveSummaryData = {
  criticalCount: number;
  attentionCount: number;
  infoCount: number;
  latestWeeklySummary: {
    title: string;
    body: string;
    forDay: string;
  } | null;
  scoreSnapshot: {
    latest: number | null;
    prev: number | null;
    delta: number | null;
  };
};

export async function getExecutiveSummary(
  workspaceId: string,
  projectId: string,
): Promise<ExecutiveSummaryData> {
  const [stats, snapshots] = await Promise.all([
    executiveInsightQueries.getSummaryStats(workspaceId, projectId),
    prisma.visibilityScoreSnapshot.findMany({
      where: { workspaceId, projectId },
      orderBy: { day: "desc" },
      take: 2,
      select: { total: true, day: true },
    }),
  ]);

  const latest = snapshots[0]?.total ?? null;
  const prev = snapshots[1]?.total ?? null;
  const delta = latest !== null && prev !== null ? latest - prev : null;

  return {
    criticalCount: stats.criticalCount,
    attentionCount: stats.attentionCount,
    infoCount: stats.infoCount,
    latestWeeklySummary: stats.latestWeeklySummary
      ? {
          title: stats.latestWeeklySummary.title,
          body: stats.latestWeeklySummary.body,
          forDay: stats.latestWeeklySummary.forDay,
        }
      : null,
    scoreSnapshot: { latest, prev, delta },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight feed (Explorer)
// ─────────────────────────────────────────────────────────────────────────────

export type InsightListItem = Awaited<
  ReturnType<typeof executiveInsightQueries.listInsights>
>[number];

export async function getAllInsights(
  workspaceId: string,
  projectId: string,
  limit = 100,
) {
  return executiveInsightQueries.listInsights({
    workspaceId,
    projectId,
    sinceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    limit,
  });
}

export async function getCriticalAlerts(
  workspaceId: string,
  projectId: string,
) {
  return executiveInsightQueries.listAlerts(workspaceId, projectId, 8);
}

export async function getGrowthOpportunities(
  workspaceId: string,
  projectId: string,
) {
  return executiveInsightQueries.listOpportunities(workspaceId, projectId, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility trends (30d score history)
// ─────────────────────────────────────────────────────────────────────────────

export type VisibilityTrendPoint = {
  day: string;
  total: number;
  byProvider: Record<string, number>;
  citationRate: number;
  confidence: number;
};

export async function getVisibilityTrends(
  workspaceId: string,
  projectId: string,
  days = 30,
): Promise<VisibilityTrendPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const snapshots = await prisma.visibilityScoreSnapshot.findMany({
    where: { workspaceId, projectId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { day: true, total: true, byProvider: true, citationRate: true, confidence: true },
  });

  return snapshots.map((s) => ({
    day: s.day.toISOString().slice(0, 10),
    total: s.total,
    byProvider: (s.byProvider as Record<string, number>) ?? {},
    citationRate: s.citationRate,
    confidence: s.confidence,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider intelligence
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderIntelligenceItem = {
  provider: string;
  latestScore: number;
  avgScore: number;
  volatility: number;
  trend: "up" | "down" | "flat";
};

export async function getProviderIntelligence(
  workspaceId: string,
  projectId: string,
): Promise<ProviderIntelligenceItem[]> {
  const [snapshots, volatility] = await Promise.all([
    prisma.visibilityScoreSnapshot.findMany({
      where: {
        workspaceId,
        projectId,
        day: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { day: "asc" },
      select: { byProvider: true, day: true },
    }),
    prisma.providerVolatilityMetric.findMany({
      where: {
        workspaceId,
        projectId,
        day: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { provider: true, volatility: true },
    }),
  ]);

  const volatilityByProvider = new Map<string, number>();
  for (const v of volatility) {
    const prev = volatilityByProvider.get(v.provider) ?? 0;
    volatilityByProvider.set(v.provider, Math.max(prev, v.volatility));
  }

  const byProvider = new Map<string, number[]>();
  for (const s of snapshots) {
    const bp = (s.byProvider as Record<string, number>) ?? {};
    for (const [provider, score] of Object.entries(bp)) {
      const list = byProvider.get(provider) ?? [];
      list.push(score);
      byProvider.set(provider, list);
    }
  }

  return [...byProvider.entries()].map(([provider, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latest = scores[scores.length - 1] ?? 0;
    const prior = scores[Math.max(0, scores.length - 8)] ?? 0;
    const trend: "up" | "down" | "flat" =
      latest - prior > 2 ? "up" : latest - prior < -2 ? "down" : "flat";
    return {
      provider,
      latestScore: Math.round(latest),
      avgScore: Math.round(avg),
      volatility: Math.round(volatilityByProvider.get(provider) ?? 0),
      trend,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor intelligence (30d)
// ─────────────────────────────────────────────────────────────────────────────

export type CompetitorSharePoint = {
  entity: string;
  shareOfVoice: number;
  avgRank: number | null;
  mentions: number;
  byProvider: Record<string, number>;
  byCategory: Record<string, number>;
};

export type CompetitorTrendPoint = {
  day: string;
  byEntity: Record<string, number>;
};

export type CompetitorIntelligenceData = {
  shareOfVoice: CompetitorSharePoint[];
  trends: CompetitorTrendPoint[];
};

export async function getCompetitorIntelligence(
  workspaceId: string,
  projectId: string,
  days = 30,
): Promise<CompetitorIntelligenceData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const metrics = await prisma.competitorDailyMetric.findMany({
    where: { workspaceId, projectId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: {
      day: true,
      entity: true,
      mentions: true,
      shareOfVoice: true,
      avgRank: true,
      byProvider: true,
      byCategory: true,
    },
  });

  // Aggregate share of voice per entity
  const entityMap = new Map<
    string,
    { mentions: number; sovSum: number; count: number; avgRanks: number[]; byProvider: Record<string, number>; byCategory: Record<string, number> }
  >();
  for (const m of metrics) {
    const e = entityMap.get(m.entity) ?? {
      mentions: 0, sovSum: 0, count: 0, avgRanks: [],
      byProvider: {}, byCategory: {},
    };
    e.mentions += m.mentions;
    e.sovSum += m.shareOfVoice;
    e.count++;
    if (m.avgRank !== null) e.avgRanks.push(m.avgRank);
    for (const [k, v] of Object.entries((m.byProvider as Record<string, number>) ?? {})) {
      e.byProvider[k] = (e.byProvider[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries((m.byCategory as Record<string, number>) ?? {})) {
      e.byCategory[k] = (e.byCategory[k] ?? 0) + v;
    }
    entityMap.set(m.entity, e);
  }

  const shareOfVoice: CompetitorSharePoint[] = [...entityMap.entries()]
    .map(([entity, e]) => ({
      entity,
      shareOfVoice: e.count > 0 ? e.sovSum / e.count : 0,
      avgRank: e.avgRanks.length > 0 ? e.avgRanks.reduce((a, b) => a + b, 0) / e.avgRanks.length : null,
      mentions: e.mentions,
      byProvider: e.byProvider,
      byCategory: e.byCategory,
    }))
    .sort((a, b) => b.shareOfVoice - a.shareOfVoice)
    .slice(0, 8);

  // Daily trend by entity (top 5 entities)
  const topEntities = shareOfVoice.slice(0, 5).map((e) => e.entity);
  const trendMap = new Map<string, Record<string, number>>();
  for (const m of metrics) {
    if (!topEntities.includes(m.entity)) continue;
    const day = m.day.toISOString().slice(0, 10);
    const slot = trendMap.get(day) ?? {};
    slot[m.entity] = m.shareOfVoice;
    trendMap.set(day, slot);
  }
  const trends: CompetitorTrendPoint[] = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, byEntity]) => ({ day, byEntity }));

  return { shareOfVoice, trends };
}

// ─────────────────────────────────────────────────────────────────────────────
// Citation intelligence (30d)
// ─────────────────────────────────────────────────────────────────────────────

export type CitationDomainStat = {
  domain: string;
  totalCitations: number;
  avgAuthority: number;
  byProvider: Record<string, number>;
  trend: "up" | "down" | "flat";
};

export type CitationTrendPoint = {
  day: string;
  total: number;
  avgAuthority: number;
};

export type CitationIntelligenceData = {
  topDomains: CitationDomainStat[];
  trends: CitationTrendPoint[];
  totalCitations: number;
  avgAuthority: number;
};

export async function getCitationIntelligence(
  workspaceId: string,
  projectId: string,
  days = 30,
): Promise<CitationIntelligenceData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  const [current, prev] = await Promise.all([
    prisma.citationDailyMetric.findMany({
      where: { workspaceId, projectId, day: { gte: since } },
      orderBy: { day: "asc" },
      select: { day: true, domain: true, count: true, authorityScore: true, byProvider: true },
    }),
    prisma.citationDailyMetric.findMany({
      where: { workspaceId, projectId, day: { gte: prevSince, lt: since } },
      select: { domain: true, count: true },
    }),
  ]);

  const prevByDomain = new Map<string, number>();
  for (const m of prev) {
    prevByDomain.set(m.domain, (prevByDomain.get(m.domain) ?? 0) + m.count);
  }

  const domainMap = new Map<string, { total: number; authoritySum: number; count: number; byProvider: Record<string, number> }>();
  const dayMap = new Map<string, { total: number; authoritySum: number; count: number }>();

  for (const m of current) {
    const d = domainMap.get(m.domain) ?? { total: 0, authoritySum: 0, count: 0, byProvider: {} };
    d.total += m.count;
    d.authoritySum += m.authorityScore * m.count;
    d.count += m.count;
    for (const [k, v] of Object.entries((m.byProvider as Record<string, number>) ?? {})) {
      d.byProvider[k] = (d.byProvider[k] ?? 0) + v;
    }
    domainMap.set(m.domain, d);

    const day = m.day.toISOString().slice(0, 10);
    const ds = dayMap.get(day) ?? { total: 0, authoritySum: 0, count: 0 };
    ds.total += m.count;
    ds.authoritySum += m.authorityScore * m.count;
    ds.count += m.count;
    dayMap.set(day, ds);
  }

  const topDomains: CitationDomainStat[] = [...domainMap.entries()]
    .map(([domain, d]) => {
      const prevTotal = prevByDomain.get(domain) ?? 0;
      const trend: "up" | "down" | "flat" =
        d.total > prevTotal * 1.1 ? "up" : d.total < prevTotal * 0.9 ? "down" : "flat";
      return {
        domain,
        totalCitations: d.total,
        avgAuthority: d.count > 0 ? d.authoritySum / d.count : 0,
        byProvider: d.byProvider,
        trend,
      };
    })
    .sort((a, b) => b.totalCitations - a.totalCitations)
    .slice(0, 15);

  const trends: CitationTrendPoint[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({
      day,
      total: d.total,
      avgAuthority: d.count > 0 ? d.authoritySum / d.count : 0,
    }));

  const totalCitations = [...domainMap.values()].reduce((a, d) => a + d.total, 0);
  const authorityNums = [...domainMap.values()].filter(d => d.count > 0);
  const avgAuthority = authorityNums.length > 0
    ? authorityNums.reduce((a, d) => a + d.authoritySum / d.count, 0) / authorityNums.length
    : 0;

  return { topDomains, trends, totalCitations, avgAuthority };
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand trust score
// ─────────────────────────────────────────────────────────────────────────────

export type BrandTrustData = {
  score: number;
  delta: number | null;
  citationRate: number;
  sentimentBonus: number;
  confidence: number;
  sampleSize: number;
};

export async function getBrandTrustScore(
  workspaceId: string,
  projectId: string,
): Promise<BrandTrustData> {
  const snapshots = await prisma.visibilityScoreSnapshot.findMany({
    where: { workspaceId, projectId },
    orderBy: { day: "desc" },
    take: 8,
    select: {
      total: true,
      citationRate: true,
      sentimentBonus: true,
      confidence: true,
      sampleSize: true,
    },
  });

  const latest = snapshots[0];
  const prev = snapshots[7] ?? snapshots[snapshots.length - 1];

  if (!latest) {
    return { score: 0, delta: null, citationRate: 0, sentimentBonus: 0, confidence: 0, sampleSize: 0 };
  }

  return {
    score: Math.round(latest.total),
    delta: prev && prev !== latest ? Math.round(latest.total - prev.total) : null,
    citationRate: latest.citationRate,
    sentimentBonus: latest.sentimentBonus,
    confidence: latest.confidence,
    sampleSize: latest.sampleSize,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationItem = Awaited<
  ReturnType<typeof geoQueries.listRecommendations>
>[number];

export async function getRecommendations(projectId: string) {
  const [items, summary] = await Promise.all([
    geoQueries.listRecommendations({ projectId }),
    geoQueries.getSummary(projectId),
  ]);
  return { items, summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full analytics snapshot (re-exports fetchAnalytics for intelligence pages)
// ─────────────────────────────────────────────────────────────────────────────

export { fetchAnalytics };
