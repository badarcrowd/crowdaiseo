import { Worker } from "bullmq";
import { QUEUE_NAMES } from "../queues";
import { createQueueConnection } from "../connection";
import { attachDlq } from "../dlq";
import type { CrawlStartPayload } from "../types";
import { logger } from "@/lib/logger";
import { serverEnv } from "@/config/env";
import { handleCrawlStart } from "@/modules/crawler/application/orchestrator";
import { crawlRepository } from "@/modules/crawler/infrastructure/crawl.repository";
import { staticFetcher } from "@/modules/crawler/infrastructure/static-fetcher";
import { createRateLimiter } from "@/modules/crawler/infrastructure/rate-limiter";
import { frontier } from "@/modules/crawler/infrastructure/frontier";

const rateLimiter = createRateLimiter({ capacity: 6, refillPerSec: 3 });

/**
 * Crawl start orchestration. Concurrency is low — each job spawns many
 * `crawl.page` jobs, so the heavy work happens in the page worker.
 */
export const crawlStartWorker = new Worker<CrawlStartPayload>(
  QUEUE_NAMES.CRAWL_START,
  async (job) => {
    logger.info({ jobId: job.id, crawlId: job.data.crawlId }, "crawl.start");
    try {
      return await handleCrawlStart(
        { repo: crawlRepository, fetcher: staticFetcher, rateLimiter, frontier },
        job.data,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      logger.error({ crawlId: job.data.crawlId, err: msg }, "crawl.start failed");
      await crawlRepository.finishCrawl(job.data.crawlId, {
        status: "FAILED",
        error: msg,
      });
      throw err;
    }
  },
  {
    connection: createQueueConnection(),
    prefix: serverEnv.QUEUE_PREFIX,
    concurrency: 2,
  },
);

crawlStartWorker.on("failed", (job, err) =>
  logger.error(
    { jobId: job?.id, attempts: job?.attemptsMade, err: err.message },
    "crawl.start worker: job failed",
  ),
);

attachDlq(crawlStartWorker, QUEUE_NAMES.CRAWL_START);
