import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, queues } from "../queues";
import { createQueueConnection } from "../connection";
import { attachDlq } from "../dlq";
import { logger } from "@/lib/logger";
import type { ReportGeneratePayload, ReportScheduleTickPayload } from "../types";
import { generateReport } from "@/modules/reports/application/generate";
import { tickScheduler } from "@/modules/reports/application/scheduler";

/**
 * Reports — two workers:
 *
 *   - report.generate: heavy worker; renders one PDF per job. Low
 *     concurrency by default because Playwright is memory-hungry.
 *   - report.schedule-tick: light worker; fans out due schedules.
 *     A single repeatable job (registered at boot) keeps it pulsing
 *     every minute.
 */

const GENERATE_CONCURRENCY = Number(process.env.REPORTS_CONCURRENCY ?? 2);

const generateWorker = new Worker<ReportGeneratePayload>(
  QUEUE_NAMES.REPORT_GENERATE,
  async (job: Job<ReportGeneratePayload>) => {
    const payload = job.data;
    await generateReport(payload);
  },
  {
    connection: createQueueConnection(),
    concurrency: GENERATE_CONCURRENCY,
  },
);
attachDlq(generateWorker, QUEUE_NAMES.DLQ);

const scheduleWorker = new Worker<ReportScheduleTickPayload>(
  QUEUE_NAMES.REPORT_SCHEDULE_TICK,
  async () => {
    await tickScheduler();
  },
  {
    connection: createQueueConnection(),
    concurrency: 1,
  },
);
attachDlq(scheduleWorker, QUEUE_NAMES.DLQ);

// Register the repeatable tick on boot. Idempotent — BullMQ deduplicates
// by repeat key, so calling on every worker start is safe.
void (async () => {
  try {
    await queues.reportScheduleTick.add(
      "tick",
      { tickedAt: new Date().toISOString() },
      {
        jobId: "reports-schedule-tick",
        repeat: { every: 60_000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    logger.info("reports.worker: schedule tick registered");
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err },
      "reports.worker: failed to register schedule tick",
    );
  }
})();

logger.info(
  { concurrency: GENERATE_CONCURRENCY },
  "reports.worker: started",
);

export { generateWorker, scheduleWorker };
