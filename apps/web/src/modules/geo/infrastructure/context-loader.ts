import type { PromptCategory, ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { analyzeCitations } from "@/modules/ai-visibility/intelligence/application/citations";
import { analyzeCompetitors } from "@/modules/ai-visibility/intelligence/application/competitors";
import { domainAuthority } from "@/modules/ai-visibility/intelligence/domain/authority";
import type { IntelligenceRunSample } from "@/modules/ai-visibility/intelligence/domain/types";
import type { RecommendationContext } from "../domain/types";

/**
 * Build a RecommendationContext for a project by joining:
 *   - latest crawl (issues + extracted pages)
 *   - latest visibility snapshot (score, byProvider, sample size)
 *   - last 30 days of prompt runs (for category mention rates, weak
 *     prompts, sentiment averages, and live competitor/citation analysis)
 *
 * The loader does all the database work — generators read the context
 * synchronously and stay pure.
 */

const LOOKBACK_DAYS = 30;
const MAX_RUNS_FOR_CONTEXT = 3000;
const MAX_PAGES_FOR_CONTEXT = 500;

export const loadRecommendationContext = async (
  projectId: string,
): Promise<RecommendationContext | null> => {
  assertServerRuntime();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      domain: true,
      keywords: true,
    },
  });
  if (!project) return null;

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

  const [latestCrawl, latestSnapshot, runs] = await Promise.all([
    prisma.crawl.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      select: {
        id: true,
        pagesCrawled: true,
        hasRobotsTxt: true,
        hasSitemap: true,
      },
    }),
    prisma.visibilityScoreSnapshot.findFirst({
      where: { projectId },
      orderBy: { day: "desc" },
    }),
    prisma.promptRun.findMany({
      where: {
        workspaceId: project.workspaceId,
        prompt: { projectId },
        status: { in: ["COMPLETED", "CACHED"] },
        createdAt: { gte: since },
      },
      select: {
        promptId: true,
        provider: true,
        brandMentioned: true,
        brandRank: true,
        sentimentScore: true,
        prompt: { select: { name: true, category: true } },
        mentions: { select: { kind: true, entity: true, rank: true } },
        citations: { select: { domain: true, rank: true } },
      },
      take: MAX_RUNS_FOR_CONTEXT,
    }),
  ]);

  const [issues, pages] = latestCrawl
    ? await Promise.all([
        prisma.crawlIssue.findMany({
          where: { crawlId: latestCrawl.id },
          select: {
            code: true,
            severity: true,
            category: true,
            message: true,
            pageId: true,
          },
        }),
        prisma.crawlPage.findMany({
          where: { crawlId: latestCrawl.id, status: "PARSED" },
          select: {
            url: true,
            title: true,
            metaDescription: true,
            wordCount: true,
            h1: true,
            schemas: true,
          },
          take: MAX_PAGES_FOR_CONTEXT,
        }),
      ])
    : [[], []];

  // ---- Crawl page summary ----
  type RawPage = (typeof pages)[number];
  const crawlPages = pages.map((p: RawPage) => {
    const schemas = Array.isArray(p.schemas)
      ? (p.schemas as Array<Record<string, unknown>>)
      : [];
    const schemaTypes = schemas
      .map((s) => {
        const t = s["@type"];
        return typeof t === "string" ? t.toLowerCase() : "";
      })
      .filter(Boolean);
    return {
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription,
      wordCount: p.wordCount,
      h1Count: p.h1.length,
      hasSchema: schemas.length > 0,
      hasFaqSchema: schemaTypes.includes("faqpage"),
      hasOrgSchema: schemaTypes.some((t) => t.includes("organization")),
      hasArticleSchema: schemaTypes.some((t) =>
        ["article", "blogposting", "newsarticle"].includes(t),
      ),
      hasBreadcrumbSchema: schemaTypes.includes("breadcrumblist"),
    };
  });

  // ---- Issue aggregation ----
  type RawIssue = (typeof issues)[number];
  const issueCounts = new Map<
    string,
    { count: number; severity: string; category: string }
  >();
  for (const i of issues as RawIssue[]) {
    const existing = issueCounts.get(i.code);
    if (existing) existing.count++;
    else issueCounts.set(i.code, { count: 1, severity: i.severity, category: i.category });
  }

  // ---- Visibility signals derived from runs ----
  const totalRuns = runs.length;

  const byCategoryAgg = new Map<
    PromptCategory,
    { total: number; mentioned: number }
  >();
  type RawRun = (typeof runs)[number];
  for (const r of runs as RawRun[]) {
    const cat = r.prompt.category;
    const slot = byCategoryAgg.get(cat) ?? { total: 0, mentioned: 0 };
    slot.total++;
    if (r.brandMentioned) slot.mentioned++;
    byCategoryAgg.set(cat, slot);
  }
  const categoryMentionRate = Object.fromEntries(
    [...byCategoryAgg.entries()].map(([cat, s]) => [
      cat,
      s.total > 0 ? s.mentioned / s.total : 0,
    ]),
  ) as Record<PromptCategory, number>;

  // Weak prompts: prompts where the brand mention rate < 0.3 across
  // >=3 runs (enough signal to act on).
  const byPrompt = new Map<
    string,
    {
      promptId: string;
      name: string;
      category: PromptCategory;
      total: number;
      mentioned: number;
    }
  >();
  for (const r of runs as RawRun[]) {
    const slot = byPrompt.get(r.promptId) ?? {
      promptId: r.promptId,
      name: r.prompt.name,
      category: r.prompt.category,
      total: 0,
      mentioned: 0,
    };
    slot.total++;
    if (r.brandMentioned) slot.mentioned++;
    byPrompt.set(r.promptId, slot);
  }
  const weakPrompts = [...byPrompt.values()]
    .filter((p) => p.total >= 3 && p.mentioned / p.total < 0.3)
    .map((p) => ({
      promptId: p.promptId,
      name: p.name,
      category: p.category,
      mentionRate: p.mentioned / p.total,
    }))
    .sort((a, b) => a.mentionRate - b.mentionRate);

  // ---- Sentiment ----
  const sentiments = runs
    .map((r) => r.sentimentScore)
    .filter((s): s is number => s !== null);
  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;
  const negativeShare =
    sentiments.length > 0
      ? sentiments.filter((s) => s < -0.2).length / sentiments.length
      : 0;

  // ---- Live competitor + citation analysis over the same window ----
  const samples: IntelligenceRunSample[] = runs.map((r) => ({
    provider: r.provider,
    promptCategory: r.prompt.category,
    brandMentioned: r.brandMentioned,
    brandRank: r.brandRank,
    sentimentScore: r.sentimentScore,
    citationCount: r.citations.length,
    citationAuthoritySum: r.citations.reduce(
      (sum, c) => sum + domainAuthority(c.domain),
      0,
    ),
    competitorMentions: r.mentions
      .filter((m) => m.kind === "COMPETITOR")
      .map((m) => ({ entity: m.entity, rank: m.rank })),
    citationDomains: r.citations.map((c) => ({ domain: c.domain, rank: c.rank })),
  }));

  const competitorAnalysis = analyzeCompetitors(samples);
  const citationAnalysis = analyzeCitations(samples, project.domain);

  const dominantByCategory = new Map<
    PromptCategory,
    { entity: string; share: number }
  >();
  for (const agg of competitorAnalysis.aggregates) {
    for (const [cat, count] of Object.entries(agg.byCategory) as Array<[
      PromptCategory,
      number,
    ]>) {
      const totalInCat = byCategoryAgg.get(cat)?.total ?? 0;
      if (totalInCat === 0) continue;
      const share = count / totalInCat;
      if (share < 0.5) continue;
      const current = dominantByCategory.get(cat);
      if (!current || share > current.share) {
        dominantByCategory.set(cat, { entity: agg.entity, share });
      }
    }
  }

  // Top domains where the brand is absent — sample of domains AI
  // cites heavily and where the brand domain isn't represented at all.
  const brandHost = project.domain.toLowerCase();
  const topDomainsBrandMissing = citationAnalysis.aggregates
    .slice(0, 30)
    .map((a) => a.domain)
    .filter((d) => !d.toLowerCase().includes(brandHost));

  // ---- Snapshot signals ----
  const latestScore = latestSnapshot?.total ?? null;
  const confidence = latestSnapshot?.confidence ?? 0;
  const sampleSize = latestSnapshot?.sampleSize ?? totalRuns;
  const byProvider =
    (latestSnapshot?.byProvider as Record<ProviderId, number> | undefined) ?? {
      OPENAI: 0,
      ANTHROPIC: 0,
      GOOGLE: 0,
      PERPLEXITY: 0,
    };

  return {
    project,
    crawl: {
      crawlId: latestCrawl?.id ?? null,
      pagesCrawled: latestCrawl?.pagesCrawled ?? 0,
      hasRobotsTxt: latestCrawl?.hasRobotsTxt ?? false,
      hasSitemap: latestCrawl?.hasSitemap ?? false,
      issues: issues as Array<{
        code: string;
        severity: string;
        category: string;
        message: string;
        pageId: string | null;
      }> as RecommendationContext["crawl"]["issues"],
      issueCounts,
      pages: crawlPages,
    },
    visibility: {
      latestScore,
      confidence,
      sampleSize,
      byProvider,
      categoryMentionRate,
      weakPrompts,
    },
    citations: {
      opportunities: citationAnalysis.opportunities.map((o) => ({
        domain: o.domain,
        reason: o.reason,
        score: o.score,
        authority:
          citationAnalysis.aggregates.find((a) => a.domain === o.domain)
            ?.authorityScore ?? 0,
      })),
      topDomainsBrandMissing,
    },
    competitors: {
      dominantByCategory,
      biggestGaps: competitorAnalysis.gaps.slice(0, 5).map((g) => ({
        entity: g.entity,
        delta: g.delta,
        dominantCategories: g.dominantCategories,
      })),
    },
    sentiment: { avgScore: avgSentiment, negativeShare },
  };
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("loadRecommendationContext must run on the server");
  }
}
