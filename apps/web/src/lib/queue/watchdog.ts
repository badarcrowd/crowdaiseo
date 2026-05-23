import { logger } from "@/lib/logger";
import { captureException } from "@/lib/observability/sentry";

// Scans/crawls stuck in RUNNING longer than this are assumed orphaned
// (worker crashed before finalizing). Threshold should be > max possible
// scan duration: 300 prompts × 4 providers × 60s timeout = very generous 4h.
const SCAN_STALL_MS = 4 * 60 * 60 * 1_000;
const CRAWL_STALL_MS = 6 * 60 * 60 * 1_000;
const CHECK_INTERVAL_MS = 5 * 60 * 1_000; // every 5 min

let _timer: ReturnType<typeof setInterval> | null = null;

export const startWatchdog = (): void => {
  if (_timer) return;
  _timer = setInterval(runChecks, CHECK_INTERVAL_MS);
  // Run immediately on boot to catch anything leftover from a prior crash.
  runChecks().catch((err) =>
    logger.error({ err: err instanceof Error ? err.message : err }, "watchdog boot check failed"),
  );
  logger.info("watchdog started");
};

export const stopWatchdog = (): void => {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
};

const runChecks = async (): Promise<void> => {
  const { prisma } = await import("@/lib/prisma/client");
  const now = new Date();

  // ---- Stalled scans ------------------------------------------------
  try {
    const stalledScans = await prisma.visibilityScan.findMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: new Date(now.getTime() - SCAN_STALL_MS) },
      },
      select: { id: true, startedAt: true, workspaceId: true },
      take: 100,
    });

    for (const scan of stalledScans) {
      logger.warn(
        { scanId: scan.id, startedAt: scan.startedAt, workspaceId: scan.workspaceId },
        "watchdog: marking stalled scan FAILED",
      );
      await prisma.visibilityScan.update({
        where: { id: scan.id, status: "RUNNING" }, // guard against concurrent finalization
        data: {
          status: "FAILED",
          finishedAt: now,
          error: "watchdog: scan exceeded maximum allowed duration",
        },
      }).catch(() => null); // ignore if already updated
    }

    if (stalledScans.length > 0) {
      captureException(
        new Error(`watchdog: ${stalledScans.length} stalled scans marked FAILED`),
        { count: stalledScans.length },
      );
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "watchdog: scan check failed");
  }

  // ---- Stalled crawls -----------------------------------------------
  try {
    const stalledCrawls = await prisma.crawl.findMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: new Date(now.getTime() - CRAWL_STALL_MS) },
      },
      select: { id: true, startedAt: true, workspaceId: true },
      take: 100,
    });

    for (const crawl of stalledCrawls) {
      logger.warn(
        { crawlId: crawl.id, startedAt: crawl.startedAt },
        "watchdog: marking stalled crawl FAILED",
      );
      await prisma.crawl.update({
        where: { id: crawl.id, status: "RUNNING" },
        data: {
          status: "FAILED",
          finishedAt: now,
          error: "watchdog: crawl exceeded maximum allowed duration",
        },
      }).catch(() => null);
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "watchdog: crawl check failed");
  }
};
