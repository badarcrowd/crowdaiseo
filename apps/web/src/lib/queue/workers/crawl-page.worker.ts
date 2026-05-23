import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../queues";
import { createQueueConnection } from "../connection";
import { attachDlq } from "../dlq";
import type { CrawlPagePayload } from "../types";
import { logger } from "@/lib/logger";
import { serverEnv } from "@/config/env";
import { inc, observe } from "@/lib/observability/metrics";
import { handleCrawlPage } from "@/modules/crawler/application/orchestrator";
import { crawlRepository } from "@/modules/crawler/infrastructure/crawl.repository";
import { staticFetcher } from "@/modules/crawler/infrastructure/static-fetcher";
import { playwrightFetcher } from "@/modules/crawler/infrastructure/playwright-fetcher";
import { createRateLimiter } from "@/modules/crawler/infrastructure/rate-limiter";
import { frontier } from "@/modules/crawler/infrastructure/frontier";

const CRAWL_CONCURRENCY = Number(process.env.CRAWL_WORKER_CONCURRENCY ?? 10);
const USE_PLAYWRIGHT = process.env.CRAWL_USE_PLAYWRIGHT === "1";

// Shared per-process limiter — Lua-backed in Redis, so still coherent
// across worker processes for the same origin.
const rateLimiter = createRateLimiter({
  capacity: Number(process.env.CRAWL_RATE_CAPACITY ?? 4),
  refillPerSec: Number(process.env.CRAWL_RATE_REFILL ?? 2),
});

const fetcher = USE_PLAYWRIGHT ? playwrightFetcher : staticFetcher;

export const crawlPageWorker = new Worker<CrawlPagePayload>(
  QUEUE_NAMES.CRAWL_PAGE,
  async (job) => {
    const started = Date.now();
    const result = await handleCrawlPage(
      { repo: crawlRepository, fetcher, rateLimiter, frontier },
      job.data,
      job,
    );
    observe("crawl_page_ms", Date.now() - started, {});
    inc("crawl_pages_processed_total");
    return result;
  },
  {
    connection: createQueueConnection(),
    prefix: serverEnv.QUEUE_PREFIX,
    concurrency: CRAWL_CONCURRENCY,
    // lockDuration: crawl pages can be slow (Playwright + heavy sites).
    // 60s per page + rate-limiter wait — set to 120s to avoid false stalls.
    lockDuration: 120_000,
    // Limit globally to avoid per-host bursts when many crawls run.
    // Per-origin limits enforced by the rate limiter in the handler.
    limiter: { max: 50, duration: 1000 },
  },
);

attachDlq(crawlPageWorker, QUEUE_NAMES.CRAWL_PAGE);

crawlPageWorker.on("completed", (job) =>
  logger.debug(
    { jobId: job.id, crawlId: job.data.crawlId, url: job.data.url },
    "crawl.page complete",
  ),
);

crawlPageWorker.on("failed", async (job, err) => {
  logger.warn(
    {
      jobId: job?.id,
      url: job?.data?.url,
      attempts: job?.attemptsMade,
      err: err.message,
    },
    "crawl.page failed",
  );
  // After final retry, also mark crawl health for visibility.
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await crawlRepository.incrementCounters(job.data.crawlId, {
      pagesFailed: 1,
    });
  }
});

/**
 * Fallback completion sweep — runs when the queue drains globally.
 * The primary path is tryFinalizeCrawl() called after every page job.
 * This catches any edge cases (e.g. worker restart mid-crawl).
 */
crawlPageWorker.on("drained", async () => {
  const { prisma } = await import("@/lib/prisma/client");
  const running = await prisma.crawl.findMany({
    where: { status: "RUNNING" },
    select: { id: true },
    take: 50,
  });
  for (const c of running) {
    const pending = await prisma.crawlPage.count({
      where: { crawlId: c.id, status: { in: ["QUEUED", "FETCHING"] } },
    });
    if (pending === 0) {
      await crawlRepository.finishCrawl(c.id, { status: "COMPLETED" });
      await frontier.clear(c.id);
      logger.info({ crawlId: c.id }, "crawl completed (drained fallback)");
    }
  }
});
