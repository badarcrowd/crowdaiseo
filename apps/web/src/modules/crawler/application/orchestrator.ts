import type { Job } from "bullmq";
import { queues } from "@/lib/queue";
import type { CrawlPagePayload } from "@/lib/queue/types";
import { logger } from "@/lib/logger";
import { detectIssues } from "./issue-detectors";
import { extractFromHtml } from "./extract-page";
import {
  candidateRobotsUrls,
  isAllowedByRobots,
  parseRobotsTxt,
} from "./robots";
import {
  candidateSitemapUrls,
  flattenSitemap,
  parseSitemap,
} from "./sitemap";
import { DEFAULT_USER_AGENT, type RobotsTxt } from "../domain/entities";
import type {
  CrawlFrontier,
  CrawlRepository,
  Fetcher,
  RateLimiter,
} from "../domain/ports";
import { normalizeUrl, originOf, sameOrigin } from "../domain/url";
import { fetchTextOrBuffer } from "../infrastructure/static-fetcher";

export type OrchestratorDeps = {
  repo: CrawlRepository;
  fetcher: Fetcher;
  rateLimiter: RateLimiter;
  frontier: CrawlFrontier;
};

/**
 * Handle the `crawl.start` job:
 *   1. Mark crawl RUNNING.
 *   2. Detect robots.txt + sitemap.
 *   3. Seed the frontier with the root + sitemap URLs.
 *   4. Enqueue page-level jobs.
 */
export const handleCrawlStart = async (
  deps: OrchestratorDeps,
  payload: {
    crawlId: string;
    rootUrl: string;
    maxPages: number;
    maxDepth: number;
    respectRobots: boolean;
    userAgent?: string;
  },
) => {
  const { repo, frontier, rateLimiter } = deps;
  const ua = payload.userAgent ?? DEFAULT_USER_AGENT;
  const origin = originOf(payload.rootUrl);
  if (!origin) throw new Error(`invalid rootUrl: ${payload.rootUrl}`);

  await repo.startCrawl(payload.crawlId);

  // ---- Robots.txt ---------------------------------------------------
  let robots: RobotsTxt | null = null;
  for (const robotsUrl of candidateRobotsUrls(payload.rootUrl)) {
    await rateLimiter.acquire(origin);
    const buf = await fetchTextOrBuffer(robotsUrl, ua);
    if (buf) {
      robots = parseRobotsTxt(robotsUrl, buf.toString("utf-8"));
      await repo.recordRobotsTxt(payload.crawlId, robots);
      break;
    }
  }

  // ---- Sitemap ------------------------------------------------------
  const sitemapCandidates = robots?.sitemaps?.length
    ? robots.sitemaps
    : candidateSitemapUrls(payload.rootUrl);

  const sitemapUrls: string[] = [];
  for (const sitemapUrl of sitemapCandidates) {
    await rateLimiter.acquire(origin);
    const buf = await fetchTextOrBuffer(sitemapUrl, ua);
    if (!buf) continue;
    const parsed = parseSitemap(sitemapUrl, buf);
    const flat = await flattenSitemap(parsed, async (u) => {
      await rateLimiter.acquire(origin);
      return fetchTextOrBuffer(u, ua);
    });
    if (flat.urls.length > 0) {
      sitemapUrls.push(...flat.urls);
      await repo.recordSitemap(payload.crawlId, flat);
    }
  }

  // ---- Seed frontier ------------------------------------------------
  const seeds = [payload.rootUrl, ...sitemapUrls].slice(0, payload.maxPages);
  let enqueued = 0;
  for (const seed of seeds) {
    if (enqueued >= payload.maxPages) break;
    const normalized = normalizeUrl(seed);
    if (!normalized) continue;
    if (!sameOrigin(normalized, payload.rootUrl)) continue;

    if (
      payload.respectRobots &&
      robots &&
      !isAllowedByRobots(robots, ua, normalized)
    ) {
      continue;
    }

    const isNew = await frontier.markSeen(payload.crawlId, normalized);
    if (!isNew) continue;

    const { id: pageId, created } = await repo.upsertQueuedPage({
      crawlId: payload.crawlId,
      url: seed,
      normalizedUrl: normalized,
      depth: 0,
    });
    if (!created) continue;
    await enqueuePage({
      crawlId: payload.crawlId,
      url: seed,
      depth: 0,
      origin,
      pageId,
    });
    enqueued++;
  }

  await repo.incrementCounters(payload.crawlId, { pagesFound: enqueued });
  logger.info(
    { crawlId: payload.crawlId, seeds: enqueued, hasRobots: !!robots },
    "crawl.start: frontier seeded",
  );

  return { seeds: enqueued, hasRobots: !!robots, sitemaps: sitemapUrls.length };
};

/**
 * Handle a single `crawl.page` job: fetch, parse, persist, and enqueue
 * any newly-discovered same-origin links (until depth/page caps).
 */
export const handleCrawlPage = async (
  deps: OrchestratorDeps,
  payload: CrawlPagePayload,
  job: Job,
) => {
  const { repo, fetcher, rateLimiter, frontier } = deps;
  const crawl = await repo.getCrawl(payload.crawlId);
  if (!crawl) {
    logger.warn({ crawlId: payload.crawlId }, "crawl.page: crawl missing");
    return { skipped: true };
  }
  if (crawl.status !== "RUNNING") {
    logger.info(
      { crawlId: payload.crawlId, status: crawl.status },
      "crawl.page: crawl not running, skipping",
    );
    return { skipped: true };
  }

  // Resolve the queued page row (idempotent — created during enqueue).
  const normalized = normalizeUrl(payload.url);
  if (!normalized) return { skipped: true };
  const { id: pageId } = await repo.upsertQueuedPage({
    crawlId: payload.crawlId,
    url: payload.url,
    normalizedUrl: normalized,
    depth: payload.depth,
  });

  await repo.beginFetch(pageId);
  await rateLimiter.acquire(payload.origin);

  const fetched = await fetcher.fetch(payload.url, {
    userAgent: crawl.options.userAgent,
  });

  // If we got HTML, extract + detect issues.
  const extracted = fetched.html
    ? extractFromHtml(fetched.finalUrl, fetched.html)
    : null;
  const issues = detectIssues({
    fetched,
    extracted: extracted ?? emptyExtraction(),
    url: fetched.finalUrl,
  });

  await repo.savePageResult({
    pageId,
    crawlId: payload.crawlId,
    fetched,
    extracted,
    issues,
  });

  await repo.incrementCounters(payload.crawlId, {
    pagesCrawled: 1,
    pagesFailed: fetched.error || fetched.httpStatus >= 400 ? 1 : 0,
    issuesFound: issues.length,
  });

  // Discover & enqueue new internal links
  if (
    extracted &&
    payload.depth + 1 <= crawl.options.maxDepth
  ) {
    const seenCount = await frontier.count(payload.crawlId);
    let remaining = Math.max(0, crawl.options.maxPages - seenCount);
    let newPagesDiscovered = 0;
    for (const href of extracted.links.internal) {
      if (remaining <= 0) break;
      const norm = normalizeUrl(href);
      if (!norm) continue;
      if (!sameOrigin(norm, crawl.rootUrl)) continue;

      const isNew = await frontier.markSeen(payload.crawlId, norm);
      if (!isNew) continue;

      const { id: childId, created } = await repo.upsertQueuedPage({
        crawlId: payload.crawlId,
        url: norm,
        normalizedUrl: norm,
        depth: payload.depth + 1,
      });
      if (!created) continue;

      await enqueuePage({
        crawlId: payload.crawlId,
        url: norm,
        depth: payload.depth + 1,
        origin: payload.origin,
        pageId: childId,
      });
      remaining--;
      newPagesDiscovered++;
    }
    if (newPagesDiscovered > 0) {
      await repo.incrementCounters(payload.crawlId, {
        pagesFound: newPagesDiscovered,
      });
    }
  }

  // After every page completes, check if this crawl is now fully done.
  // tryFinalizeCrawl counts remaining QUEUED/FETCHING pages for this
  // crawl and atomically transitions RUNNING → COMPLETED when all are
  // processed. Using updateMany with `where: { status: "RUNNING" }`
  // makes it safe for concurrent workers — only one will win.
  const finalized = await repo.tryFinalizeCrawl(payload.crawlId);
  if (finalized) {
    await frontier.clear(payload.crawlId);
    logger.info({ crawlId: payload.crawlId }, "crawl finalized");
  }

  return {
    pageId,
    httpStatus: fetched.httpStatus,
    issues: issues.length,
    durationMs: fetched.durationMs,
    jobAttempt: job.attemptsMade,
  };
};

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

const enqueuePage = async (input: {
  crawlId: string;
  url: string;
  depth: number;
  origin: string;
  pageId: string;
}) => {
  // jobId stable per-page so retries don't double-fan-out.
  await queues.crawlPage.add(
    "fetch",
    {
      crawlId: input.crawlId,
      url: input.url,
      depth: input.depth,
      origin: input.origin,
    } satisfies CrawlPagePayload,
    { jobId: `${input.crawlId}-${input.pageId}` },
  );
};

const emptyExtraction = () => ({
  title: null,
  metaDescription: null,
  metaRobots: null,
  canonical: null,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
  headings: { h1: [], h2: [], h3: [] },
  links: { internal: [], external: [] },
  wordCount: 0,
  imagesMissingAlt: 0,
  schemas: [],
});
