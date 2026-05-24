import "server-only";
import type { IssueCategory, IssueSeverity } from "@prisma/client";
import type { KeywordRow } from "@/components/dashboard/keyword-trends";
import { prisma } from "@/lib/prisma/client";

type SeoPage = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  wordCount: number | null;
  internalLinks: number;
  externalLinks: number;
  imagesMissingAlt: number;
  schemas: unknown;
  fetchedAt: Date | null;
};

type SeoIssue = {
  severity: IssueSeverity;
  category: IssueCategory;
  code: string;
};

type LatestCrawl = {
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
} | null;

export type SeoAnalyticsData = {
  project: { id: string; name: string; domain: string } | null;
  latestCrawl: {
    id: string;
    status: string;
    finishedAt: string | null;
    pagesCrawled: number;
    issuesFound: number;
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
  } | null;
  score: number;
  scoreDelta: number;
  scoreTrend: number[];
  organicSeries: number[];
  aiReferralSeries: number[];
  labels: string[];
  backlinks: number;
  avgPosition: number | null;
  technicalRows: Array<{ label: string; value: number; meta: string }>;
  landingPages: Array<{
    url: string;
    sessions: number;
    delta: number;
    cvr: string;
  }>;
  keywordRows: KeywordRow[];
};

export async function getSeoAnalytics(
  workspaceId: string,
  projectId?: string,
): Promise<SeoAnalyticsData> {
  const project = await prisma.project.findFirst({
    where: {
      workspaceId,
      deletedAt: null,
      ...(projectId ? { id: projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, domain: true, keywords: true },
  });

  if (!project) return emptySeoAnalytics();

  const since = new Date(Date.now() - 30 * 86_400_000);
  const prevSince = new Date(Date.now() - 60 * 86_400_000);

  const [latestCrawl, crawls, pages, issues, citations, aiRuns, avgPositionAggregate] =
    await Promise.all([
      prisma.crawl.findFirst({
        where: { workspaceId, projectId: project.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          finishedAt: true,
          pagesCrawled: true,
          issuesFound: true,
          hasSitemap: true,
          hasRobotsTxt: true,
        },
      }),
      prisma.crawl.findMany({
        where: {
          workspaceId,
          projectId: project.id,
          createdAt: { gte: prevSince },
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          pagesCrawled: true,
          issuesFound: true,
          hasSitemap: true,
          hasRobotsTxt: true,
        },
      }),
      prisma.crawlPage.findMany({
        where: {
          crawl: { workspaceId, projectId: project.id },
          status: "PARSED",
        },
        orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
        take: 500,
        select: {
          url: true,
          title: true,
          metaDescription: true,
          h1: true,
          wordCount: true,
          internalLinks: true,
          externalLinks: true,
          imagesMissingAlt: true,
          schemas: true,
          fetchedAt: true,
        },
      }),
      prisma.crawlIssue.groupBy({
        by: ["severity", "category", "code"],
        where: {
          crawl: { workspaceId, projectId: project.id },
          createdAt: { gte: since },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.citation.groupBy({
        by: ["domain"],
        where: {
          run: {
            workspaceId,
            status: { in: ["COMPLETED", "CACHED"] },
            createdAt: { gte: since },
          },
        },
      }),
      prisma.promptRun.findMany({
        where: {
          workspaceId,
          status: { in: ["COMPLETED", "CACHED"] },
          createdAt: { gte: since },
        },
        select: { createdAt: true, brandMentioned: true },
        take: 10_000,
      }),
      prisma.promptRun.aggregate({
        where: {
          workspaceId,
          status: { in: ["COMPLETED", "CACHED"] },
          createdAt: { gte: since },
          brandRank: { not: null },
        },
        _avg: {
          brandRank: true,
        },
      }),
    ]);

  const scoreTrend = buildScoreTrend(crawls);

  // Map the grouped issues back to a lightweight array of mock SeoIssue objects to keep existing scoring functions fully intact.
  const flatIssues: SeoIssue[] = [];
  for (const group of issues) {
    const count = group._count._all;
    for (let i = 0; i < count; i++) {
      flatIssues.push({
        severity: group.severity,
        category: group.category,
        code: group.code,
      });
    }
  }

  const latestScore = scoreTrend.at(-1) ?? computeSeoScore({
    pages,
    issues: flatIssues,
    latestCrawl,
  });
  const previousScore = scoreTrend.at(-8) ?? scoreTrend[0] ?? latestScore;
  const labels = makeLabels(30);
  const aiReferralSeries = bucketAiRuns(labels, aiRuns);
  const organicSeries = estimateOrganicSeries(labels, pages);
  const technicalRows = buildTechnicalRows({
    pages,
    issues: flatIssues,
    latestCrawl,
  });

  const avgPosition = avgPositionAggregate._avg.brandRank;
  const mockAiRuns = avgPosition !== null ? [{ brandRank: avgPosition }] : [];

  return {
    project: { id: project.id, name: project.name, domain: project.domain },
    latestCrawl: latestCrawl
      ? {
          ...latestCrawl,
          status: latestCrawl.status,
          finishedAt: latestCrawl.finishedAt?.toISOString() ?? null,
        }
      : null,
    score: latestScore,
    scoreDelta: latestScore - previousScore,
    scoreTrend,
    organicSeries,
    aiReferralSeries,
    labels,
    backlinks: citations.length,
    avgPosition,
    technicalRows,
    landingPages: buildLandingPages(pages),
    keywordRows: buildKeywordRows(project.keywords, mockAiRuns),
  };
}

function emptySeoAnalytics(): SeoAnalyticsData {
  const labels = makeLabels(30);
  return {
    project: null,
    latestCrawl: null,
    score: 0,
    scoreDelta: 0,
    scoreTrend: labels.map(() => 0),
    organicSeries: labels.map(() => 0),
    aiReferralSeries: labels.map(() => 0),
    labels,
    backlinks: 0,
    avgPosition: null,
    technicalRows: [
      row("Core Web Vitals", 0),
      row("Crawlability", 0),
      row("Schema coverage", 0),
      row("Mobile usability", 0),
      row("Security (HTTPS)", 0),
    ],
    landingPages: [],
    keywordRows: [],
  };
}

function computeSeoScore(input: {
  pages: SeoPage[];
  issues: SeoIssue[];
  latestCrawl: LatestCrawl;
}) {
  const pages = input.pages;
  if (pages.length === 0) return 0;
  const errors = input.issues.filter((issue) => issue.severity === "ERROR").length;
  const warnings = input.issues.filter((issue) => issue.severity === "WARN").length;
  const titleCoverage = ratio(pages.filter((page) => page.title).length, pages.length);
  const metaCoverage = ratio(
    pages.filter((page) => page.metaDescription).length,
    pages.length,
  );
  const h1Coverage = ratio(pages.filter((page) => page.h1.length > 0).length, pages.length);
  const schemaCoverage = ratio(pages.filter((page) => page.schemas).length, pages.length);
  const crawlSignals =
    (input.latestCrawl?.hasSitemap ? 8 : 0) + (input.latestCrawl?.hasRobotsTxt ? 4 : 0);
  const issuePenalty = Math.min(35, errors * 4 + warnings * 1.5);
  return clamp(
    Math.round(
      titleCoverage * 22 +
        metaCoverage * 20 +
        h1Coverage * 16 +
        schemaCoverage * 10 +
        crawlSignals +
        30 -
        issuePenalty,
    ),
    0,
    100,
  );
}

function buildTechnicalRows(input: {
  pages: SeoPage[];
  issues: SeoIssue[];
  latestCrawl: LatestCrawl;
}) {
  const pages = input.pages;
  const count = Math.max(1, pages.length);
  const technicalIssues = input.issues.filter((issue) =>
    ["TECHNICAL", "PERFORMANCE", "INDEXABILITY"].includes(issue.category),
  ).length;
  const schemaCoverage = ratio(pages.filter((page) => page.schemas).length, count);
  const mobilePenalty = input.issues.filter((issue) =>
    issue.code.toLowerCase().includes("mobile"),
  ).length;
  const httpsCoverage = ratio(
    pages.filter((page) => page.url.startsWith("https://")).length,
    count,
  );

  return [
    row("Core Web Vitals", clamp(100 - technicalIssues * 4, 0, 100)),
    row("Crawlability", clamp((input.latestCrawl?.hasSitemap ? 60 : 30) + (input.latestCrawl?.hasRobotsTxt ? 30 : 10), 0, 100)),
    row("Schema coverage", Math.round(schemaCoverage * 100)),
    row("Mobile usability", clamp(100 - mobilePenalty * 10, 0, 100)),
    row("Security (HTTPS)", Math.round(httpsCoverage * 100)),
  ];
}

function buildLandingPages(
  pages: SeoPage[],
) {
  return pages
    .slice()
    .sort((a, b) => landingScore(b) - landingScore(a))
    .slice(0, 8)
    .map((page) => {
      const score = landingScore(page);
      return {
        url: pathname(page.url),
        sessions: score,
        delta: 0,
        cvr: page.internalLinks > 0 ? `${Math.min(12, page.externalLinks + 1).toFixed(1)}%` : "0.0%",
      };
    });
}

function buildKeywordRows(
  keywords: string[],
  aiRuns: Array<{ brandRank: number | null }>,
): KeywordRow[] {
  const avgRank = avg(
    aiRuns
      .filter((run): run is typeof run & { brandRank: number } => run.brandRank !== null)
      .map((run) => run.brandRank),
  );
  return keywords.slice(0, 10).map((keyword, index) => ({
    keyword,
    position: avgRank ? Math.max(1, Math.round(avgRank + index)) : 0,
    delta: 0,
    volume: 0,
    trend: makeLabels(20).map(() => (avgRank ? Math.max(1, Math.round(avgRank + index)) : 0)),
  }));
}

function buildScoreTrend(
  crawls: Array<{
    createdAt: Date;
    pagesCrawled: number;
    issuesFound: number;
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
  }>,
) {
  const labels = makeLabels(30);
  if (crawls.length === 0) return labels.map(() => 0);
  const byDay = new Map(crawls.map((crawl) => [isoDay(crawl.createdAt), crawl]));
  let last = 0;
  return labels.map((day) => {
    const crawl = byDay.get(day);
    if (crawl) {
      last = clamp(
        Math.round(
          45 +
            Math.min(30, crawl.pagesCrawled) +
            (crawl.hasSitemap ? 10 : 0) +
            (crawl.hasRobotsTxt ? 5 : 0) -
            Math.min(35, crawl.issuesFound * 2),
        ),
        0,
        100,
      );
    }
    return last;
  });
}

function bucketAiRuns(
  labels: string[],
  runs: Array<{ createdAt: Date; brandMentioned: boolean }>,
) {
  const byDay = new Map<string, number>();
  for (const run of runs) {
    if (!run.brandMentioned) continue;
    const day = isoDay(run.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return labels.map((day) => byDay.get(day) ?? 0);
}

function estimateOrganicSeries(
  labels: string[],
  pages: Array<{ fetchedAt: Date | null; internalLinks: number; externalLinks: number; wordCount: number | null }>,
) {
  const base = pages.reduce(
    (sum, page) =>
      sum +
      Math.max(1, page.internalLinks) +
      Math.max(0, page.externalLinks) +
      Math.floor((page.wordCount ?? 0) / 250),
    0,
  );
  return labels.map(() => base);
}

function landingScore(page: {
  internalLinks: number;
  externalLinks: number;
  wordCount: number | null;
}) {
  return Math.max(
    0,
    page.internalLinks * 10 + page.externalLinks * 4 + Math.floor((page.wordCount ?? 0) / 50),
  );
}

function makeLabels(days: number) {
  return Array.from({ length: days }, (_, i) =>
    isoDay(new Date(Date.now() - (days - 1 - i) * 86_400_000)),
  );
}

function pathname(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}

function row(label: string, value: number) {
  const rounded = Math.round(value);
  return { label, value: rounded, meta: `${rounded} / 100` };
}

function avg(nums: number[]) {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}
