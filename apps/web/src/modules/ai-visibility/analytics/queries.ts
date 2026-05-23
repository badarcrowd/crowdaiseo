import "server-only";
import { prisma } from "@/lib/prisma/client";
import type { ProviderId } from "@prisma/client";
import { PROVIDER_LABEL } from "../presentation/labels";
import type {
  AnalyticsData,
  CompetitorStat,
  CitationStat,
  DateRange,
  MatrixCell,
  PromptStat,
  ProviderFilter,
  ProviderStat,
  ScoreBreakdown,
  SentimentPoint,
  TrendPoint,
} from "./types";

export async function fetchAnalytics(
  workspaceId: string,
  range: DateRange,
  providerFilter: ProviderFilter,
): Promise<AnalyticsData> {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 86_400_000);
  const prevSince = new Date(since.getTime() - days * 86_400_000);

  const providerWhere =
    providerFilter !== "ALL" ? { provider: providerFilter as ProviderId } : {};

  const [scans, runs, competitorMentions, citations, runningCount] =
    await Promise.all([
      // All scored scans (for score trend + prev-period comparison)
      prisma.visibilityScan.findMany({
        where: { workspaceId, score: { not: null } },
        select: { createdAt: true, score: true, scoreBreakdown: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      // Completed prompt runs for the selected period
      prisma.promptRun.findMany({
        where: {
          workspaceId,
          status: { in: ["COMPLETED", "CACHED"] },
          createdAt: { gte: since },
          ...providerWhere,
        },
        select: {
          id: true,
          promptId: true,
          provider: true,
          brandMentioned: true,
          brandRank: true,
          sentimentLabel: true,
          sentimentScore: true,
          createdAt: true,
          prompt: { select: { name: true, category: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      // Competitor entity names (COMPETITOR-kind mentions only)
      prisma.mention.findMany({
        where: {
          kind: "COMPETITOR",
          run: {
            workspaceId,
            status: { in: ["COMPLETED", "CACHED"] },
            createdAt: { gte: since },
            ...providerWhere,
          },
        },
        select: { entity: true },
        take: 20_000,
      }),
      // Citation domains
      prisma.citation.findMany({
        where: {
          run: {
            workspaceId,
            status: { in: ["COMPLETED", "CACHED"] },
            createdAt: { gte: since },
            ...providerWhere,
          },
        },
        select: { domain: true },
        take: 20_000,
      }),
      prisma.visibilityScan.count({
        where: { workspaceId, status: "RUNNING" },
      }),
    ]);

  // ---- Score summary ----
  const scansInRange = scans.filter((s) => s.createdAt >= since);
  const prevScans = scans.filter(
    (s) => s.createdAt >= prevSince && s.createdAt < since,
  );
  // scans are ordered desc — first is most recent
  const latestScan = scansInRange[0] ?? null;
  const prevScan = prevScans[0] ?? null;
  const latestScore = latestScan?.score ?? null;
  const prevScore = prevScan?.score ?? null;
  const scoreBreakdown = (latestScan?.scoreBreakdown as ScoreBreakdown | null) ?? null;

  // ---- Date buckets ----
  const buckets = makeBuckets(days);
  const runsByDate = groupBy(runs, (r) => isoDay(r.createdAt));

  // ---- Score trend ----
  const scansByDate = groupBy(
    scansInRange.slice().reverse(), // make asc for correct last-of-day pick
    (s) => isoDay(s.createdAt),
  );
  const scoreTrend: TrendPoint[] = buckets.map((date) => {
    const dayScans = scansByDate.get(date) ?? [];
    const score =
      dayScans.length > 0 ? dayScans[dayScans.length - 1].score! : 0;
    return { date, value: score };
  });

  // ---- Mention trend (% of runs mentioning brand) ----
  const mentionTrend: TrendPoint[] = buckets.map((date) => {
    const dayRuns = runsByDate.get(date) ?? [];
    if (dayRuns.length === 0) return { date, value: 0 };
    const pct = Math.round(
      (dayRuns.filter((r) => r.brandMentioned).length / dayRuns.length) * 100,
    );
    return { date, value: pct };
  });

  // ---- Ranking trend (avg brand rank; 0 = no data) ----
  const rankingTrend: TrendPoint[] = buckets.map((date) => {
    const dayRuns = runsByDate.get(date) ?? [];
    const mentioned = dayRuns.filter(
      (r): r is typeof r & { brandRank: number } =>
        r.brandMentioned && r.brandRank !== null,
    );
    if (mentioned.length === 0) return { date, value: 0 };
    return {
      date,
      value: round1(avg(mentioned.map((r) => r.brandRank))),
    };
  });

  // ---- Sentiment trend ----
  const sentimentTrend: SentimentPoint[] = buckets.map((date) => {
    const dayRuns = runsByDate.get(date) ?? [];
    return {
      date,
      POSITIVE: dayRuns.filter((r) => r.sentimentLabel === "POSITIVE").length,
      NEUTRAL: dayRuns.filter((r) => r.sentimentLabel === "NEUTRAL").length,
      NEGATIVE: dayRuns.filter((r) => r.sentimentLabel === "NEGATIVE").length,
      MIXED: dayRuns.filter((r) => r.sentimentLabel === "MIXED").length,
    };
  });

  // ---- Provider stats ----
  const byProvider = groupBy(runs, (r) => r.provider);
  const providerStats: ProviderStat[] = [...byProvider.entries()].map(
    ([provider, rs]) => {
      const mentioned = rs.filter((r) => r.brandMentioned);
      const ranks = mentioned
        .filter(
          (r): r is typeof r & { brandRank: number } => r.brandRank !== null,
        )
        .map((r) => r.brandRank);
      const sentiments = rs
        .filter(
          (r): r is typeof r & { sentimentScore: number } =>
            r.sentimentScore !== null,
        )
        .map((r) => r.sentimentScore);
      const mentionRate = rs.length > 0 ? mentioned.length / rs.length : 0;
      const avgRankVal = ranks.length > 0 ? avg(ranks) : null;
      const sentimentAvg = sentiments.length > 0 ? avg(sentiments) : 0;
      const score = Math.round(
        clamp(
          mentionRate * 60 +
            (avgRankVal !== null
              ? clamp(10 - (avgRankVal - 1) * 2, 0, 10)
              : 0) +
            clamp(sentimentAvg * 15, -15, 15),
          0,
          100,
        ),
      );
      return {
        provider,
        label: (PROVIDER_LABEL as Record<string, string>)[provider] ?? provider,
        totalRuns: rs.length,
        mentionRate,
        avgRank: avgRankVal !== null ? round1(avgRankVal) : null,
        sentimentAvg,
        score,
      };
    },
  );

  // ---- Provider × Category matrix ----
  const matrixMap = new Map<string, { total: number; mentioned: number }>();
  for (const r of runs) {
    const key = `${r.provider}||${r.prompt.category}`;
    const cell = matrixMap.get(key) ?? { total: 0, mentioned: 0 };
    cell.total++;
    if (r.brandMentioned) cell.mentioned++;
    matrixMap.set(key, cell);
  }
  const matrixCells: MatrixCell[] = [...matrixMap.entries()].map(
    ([key, cell]) => {
      const parts = key.split("||");
      return {
        provider: parts[0] ?? "",
        category: parts[1] ?? "",
        mentionRate: cell.total > 0 ? cell.mentioned / cell.total : 0,
        totalRuns: cell.total,
      };
    },
  );

  // ---- Competitor stats ----
  const compCounts = new Map<string, number>();
  for (const m of competitorMentions) {
    compCounts.set(m.entity, (compCounts.get(m.entity) ?? 0) + 1);
  }
  const totalComp = competitorMentions.length;
  const competitorStats: CompetitorStat[] = [...compCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([entity, count]) => ({
      entity,
      count,
      share: totalComp > 0 ? count / totalComp : 0,
    }));

  // ---- Citation stats ----
  const domainCounts = new Map<string, number>();
  for (const c of citations) {
    domainCounts.set(c.domain, (domainCounts.get(c.domain) ?? 0) + 1);
  }
  const totalCit = citations.length;
  const citationStats: CitationStat[] = [...domainCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([domain, count]) => ({
      domain,
      count,
      share: totalCit > 0 ? count / totalCit : 0,
    }));

  // ---- Prompt stats ----
  const byPrompt = groupBy(runs, (r) => r.promptId);
  const promptStats: PromptStat[] = [...byPrompt.entries()]
    .map(([promptId, rs]) => {
      const mentioned = rs.filter((r) => r.brandMentioned);
      const ranks = mentioned
        .filter(
          (r): r is typeof r & { brandRank: number } => r.brandRank !== null,
        )
        .map((r) => r.brandRank);
      const sentiments = rs
        .filter(
          (r): r is typeof r & { sentimentScore: number } =>
            r.sentimentScore !== null,
        )
        .map((r) => r.sentimentScore);
      return {
        promptId,
        name: rs[0].prompt.name,
        category: rs[0].prompt.category,
        totalRuns: rs.length,
        mentionRate: rs.length > 0 ? mentioned.length / rs.length : 0,
        avgRank: ranks.length > 0 ? round1(avg(ranks)) : null,
        sentimentAvg: sentiments.length > 0 ? avg(sentiments) : 0,
      };
    })
    .sort((a, b) => b.mentionRate - a.mentionRate)
    .slice(0, 25);

  return {
    latestScore,
    prevScore,
    scoreBreakdown,
    totalRuns: runs.length,
    mentionedRuns: runs.filter((r) => r.brandMentioned).length,
    scoreTrend,
    mentionTrend,
    rankingTrend,
    sentimentTrend,
    providerStats,
    matrixCells,
    competitorStats,
    citationStats,
    promptStats,
    isAnyScanRunning: runningCount > 0,
  };
}

// ---- CSV export helper (called client-side from the shell) ----
export function buildPromptCsv(stats: PromptStat[]): string {
  const lines = [
    "Prompt,Category,Total Runs,Mention Rate,Avg Rank,Avg Sentiment",
    ...stats.map((s) =>
      [
        `"${s.name.replaceAll('"', '""')}"`,
        s.category,
        s.totalRuns,
        `${Math.round(s.mentionRate * 100)}%`,
        s.avgRank !== null ? s.avgRank.toFixed(1) : "",
        s.sentimentAvg.toFixed(2),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

// ---- pure helpers ----
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const makeBuckets = (days: number): string[] =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    return isoDay(d);
  });

const avg = (nums: number[]) =>
  nums.reduce((a, b) => a + b, 0) / nums.length;

const round1 = (n: number) => Math.round(n * 10) / 10;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const groupBy = <T, K>(arr: T[], fn: (t: T) => K): Map<K, T[]> => {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = fn(item);
    const list = m.get(k);
    if (list) list.push(item);
    else m.set(k, [item]);
  }
  return m;
};
