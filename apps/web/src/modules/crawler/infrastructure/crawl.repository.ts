import { prisma } from "@/lib/prisma/client";
import type { CrawlRepository } from "../domain/ports";
import { DEFAULT_USER_AGENT } from "../domain/entities";

export const crawlRepository: CrawlRepository = {
  async getCrawl(id) {
    const c = await prisma.crawl.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      projectId: c.projectId,
      rootUrl: c.rootUrl,
      status: c.status,
      options: {
        rootUrl: c.rootUrl,
        maxPages: c.maxPages,
        maxDepth: c.maxDepth,
        respectRobots: c.respectRobots,
        userAgent: c.userAgent ?? DEFAULT_USER_AGENT,
      },
    };
  },

  async startCrawl(id) {
    await prisma.crawl.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  },

  async finishCrawl(id, outcome) {
    await prisma.crawl.update({
      where: { id },
      data: {
        status: outcome.status,
        finishedAt: new Date(),
        error: outcome.error,
      },
    });
  },

  async incrementCounters(id, c) {
    await prisma.crawl.update({
      where: { id },
      data: {
        pagesFound: c.pagesFound !== undefined ? { increment: c.pagesFound } : undefined,
        pagesCrawled: c.pagesCrawled !== undefined ? { increment: c.pagesCrawled } : undefined,
        pagesFailed: c.pagesFailed !== undefined ? { increment: c.pagesFailed } : undefined,
        issuesFound: c.issuesFound !== undefined ? { increment: c.issuesFound } : undefined,
      },
    });
  },

  async recordRobotsTxt(id, robots) {
    await prisma.$transaction([
      prisma.crawlAsset.create({
        data: {
          crawlId: id,
          kind: "ROBOTS_TXT",
          url: robots.url,
          content: robots.raw.slice(0, 100_000),
        },
      }),
      prisma.crawl.update({
        where: { id },
        data: { hasRobotsTxt: true, robotsTxtUrl: robots.url },
      }),
    ]);
  },

  async recordSitemap(id, sitemap) {
    await prisma.$transaction([
      prisma.crawlAsset.create({
        data: {
          crawlId: id,
          kind: "SITEMAP_XML",
          url: sitemap.url,
          content: sitemap.urls.slice(0, 5_000).join("\n"),
        },
      }),
      prisma.crawl.update({
        where: { id },
        data: {
          hasSitemap: true,
          sitemapUrls: { push: sitemap.url },
        },
      }),
    ]);
  },

  async upsertQueuedPage({ crawlId, url, normalizedUrl, depth }) {
    const existing = await prisma.crawlPage.findUnique({
      where: { crawlId_normalizedUrl: { crawlId, normalizedUrl } },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
    const created = await prisma.crawlPage.create({
      data: { crawlId, url, normalizedUrl, depth, status: "QUEUED" },
      select: { id: true },
    });
    return { id: created.id, created: true };
  },

  async beginFetch(pageId) {
    await prisma.crawlPage.update({
      where: { id: pageId },
      data: { status: "FETCHING" },
    });
  },

  async savePageResult({ pageId, crawlId, fetched, extracted, issues }) {
    const failed = fetched.error || fetched.httpStatus >= 400 || !extracted;

    await prisma.$transaction(async (tx) => {
      await tx.crawlPage.update({
        where: { id: pageId },
        data: {
          status: failed ? "FAILED" : "PARSED",
          httpStatus: fetched.httpStatus || null,
          contentType: fetched.contentType,
          redirectChain: fetched.redirectChain,
          fetchedAt: new Date(),
          durationMs: fetched.durationMs,
          bytes: fetched.bytes,
          error: fetched.error ?? undefined,
          ...(extracted
            ? {
                title: extracted.title,
                metaDescription: extracted.metaDescription,
                metaRobots: extracted.metaRobots,
                canonical: extracted.canonical,
                ogTitle: extracted.ogTitle,
                ogDescription: extracted.ogDescription,
                ogImage: extracted.ogImage,
                h1: extracted.headings.h1,
                h2: extracted.headings.h2,
                h3: extracted.headings.h3,
                wordCount: extracted.wordCount,
                internalLinks: extracted.links.internal.length,
                externalLinks: extracted.links.external.length,
                imagesMissingAlt: extracted.imagesMissingAlt,
                schemas:
                  extracted.schemas.length > 0
                    ? (extracted.schemas as never)
                    : undefined,
              }
            : {}),
        },
      });

      if (issues.length > 0) {
        await tx.crawlIssue.createMany({
          data: issues.map((i) => ({
            crawlId,
            pageId,
            code: i.code,
            severity: i.severity,
            category: i.category,
            message: i.message,
            details: (i.details ?? null) as never,
          })),
        });
      }
    });
  },

  async tryFinalizeCrawl(id) {
    // Count pages still in flight for this specific crawl.
    const pending = await prisma.crawlPage.count({
      where: { crawlId: id, status: { in: ["QUEUED", "FETCHING"] } },
    });
    if (pending > 0) return false;

    // Make sure the crawl has actually started processing pages before
    // we mark it done (pagesFound = 0 means seeding hasn't finished yet).
    const crawl = await prisma.crawl.findUnique({
      where: { id },
      select: { status: true, pagesFound: true },
    });
    if (crawl?.status !== "RUNNING" || (crawl?.pagesFound ?? 0) === 0)
      return false;

    // Atomic: only update when still RUNNING so concurrent workers
    // don't double-finalize.
    const result = await prisma.crawl.updateMany({
      where: { id, status: "RUNNING" },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });
    return result.count > 0;
  },

  async markPageFailed(pageId, error) {
    await prisma.crawlPage.update({
      where: { id: pageId },
      data: { status: "FAILED", error, retryCount: { increment: 1 } },
    });
  },

  async markPageSkipped(pageId, reason) {
    await prisma.crawlPage.update({
      where: { id: pageId },
      data: { status: "SKIPPED", error: reason },
    });
  },
};
