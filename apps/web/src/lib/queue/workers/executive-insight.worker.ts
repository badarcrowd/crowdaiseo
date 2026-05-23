import { Worker } from "bullmq";
import { QUEUE_NAMES, queues } from "../queues";
import { createQueueConnection } from "../connection";
import { attachDlq } from "../dlq";
import { logger } from "@/lib/logger";
import type { ExecutiveInsightWeeklyTickPayload } from "../types";
import { prisma } from "@/lib/prisma/client";
import { runExecutiveInsightPipeline } from "@/modules/executive-insights";

/**
 * Executive Insight Weekly Tick Worker.
 *
 * Fires every Monday at 08:00 UTC. For each active project it runs the
 * executive insight pipeline so the EXECUTIVE_WEEKLY_SUMMARY insight is
 * generated even on weeks where no visibility scan happens to complete
 * within the Mon–Wed generation window.
 *
 * The pipeline is idempotent — if a scan already triggered the pipeline
 * earlier in the week the upsert is a no-op.
 */

const weeklyTickWorker = new Worker<ExecutiveInsightWeeklyTickPayload>(
  QUEUE_NAMES.EXECUTIVE_INSIGHT_WEEKLY_TICK,
  async () => {
    const now = new Date();
    // The weekly summary generator guards Mon–Wed (UTC day 1–3).
    // Only fan out within that window to avoid triggering no-ops every day.
    const dayOfWeek = now.getUTCDay();
    if (dayOfWeek < 1 || dayOfWeek > 3) {
      logger.info(
        { dayOfWeek },
        "executive-insight.worker: outside Mon–Wed window, skipping",
      );
      return;
    }

    const projects = await prisma.project.findMany({
      select: { id: true, workspaceId: true },
    });

    logger.info(
      { count: projects.length },
      "executive-insight.worker: weekly tick — processing projects",
    );

    let success = 0;
    let failed = 0;

    for (const project of projects) {
      try {
        await runExecutiveInsightPipeline({
          workspaceId: project.workspaceId,
          projectId: project.id,
        });
        success++;
      } catch (err) {
        failed++;
        logger.error(
          {
            projectId: project.id,
            err: err instanceof Error ? err.message : err,
          },
          "executive-insight.worker: project pipeline failed",
        );
      }
    }

    logger.info(
      { success, failed, total: projects.length },
      "executive-insight.worker: weekly tick complete",
    );
  },
  {
    connection: createQueueConnection(),
    concurrency: 1, // Serial to avoid DB stampede across all projects
  },
);

attachDlq(weeklyTickWorker, QUEUE_NAMES.DLQ);

// Register the weekly repeatable job on boot.
// BullMQ deduplicates by repeat key so multiple worker restarts are safe.
void (async () => {
  try {
    await queues.executiveInsightWeeklyTick.add(
      "weekly-tick",
      { tickedAt: new Date().toISOString() },
      {
        jobId: "executive-insight-weekly",
        repeat: {
          pattern: "0 8 * * 1", // Every Monday at 08:00 UTC
          tz: "UTC",
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    logger.info("executive-insight.worker: weekly tick registered (Mon 08:00 UTC)");
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err },
      "executive-insight.worker: failed to register weekly tick",
    );
  }
})();

logger.info("executive-insight.worker: started");

export { weeklyTickWorker };
