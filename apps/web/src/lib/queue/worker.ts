/**
 * Worker entrypoint — run via `pnpm worker:dev` (or in a separate Vercel
 * service / Railway / Fly worker). Imports all worker modules so they
 * register their listeners.
 */
import { aiVisibilityScanWorker, aiPromptRunWorker } from "./workers/ai-visibility.worker";
import { crawlStartWorker } from "./workers/crawl-start.worker";
import { crawlPageWorker } from "./workers/crawl-page.worker";
import { weeklyTickWorker } from "./workers/executive-insight.worker";
import { startWatchdog, stopWatchdog } from "./watchdog";
import { logger } from "@/lib/logger";
import { playwrightFetcher } from "@/modules/crawler/infrastructure/playwright-fetcher";

logger.info("workers booted");
startWatchdog();

const allWorkers = [
  aiVisibilityScanWorker,
  aiPromptRunWorker,
  crawlStartWorker,
  crawlPageWorker,
  weeklyTickWorker,
];

const shutdown = async (signal: string) => {
  logger.info({ signal }, "worker shutting down");

  stopWatchdog();

  // Close all workers gracefully — waits for active jobs to complete
  // before releasing the process. This prevents BullMQ from marking
  // in-flight jobs as stalled on the next boot.
  await Promise.allSettled(
    allWorkers.map((w) =>
      w.close().catch((err: unknown) =>
        logger.error(
          { worker: w.name, err: err instanceof Error ? err.message : err },
          "worker close error",
        ),
      ),
    ),
  );

  await playwrightFetcher.close?.().catch(() => null);

  logger.info("all workers closed, exiting");
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Surface unhandled rejections as fatal errors rather than silently
// swallowing them.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandledRejection — worker process will exit");
  void shutdown("unhandledRejection");
});
