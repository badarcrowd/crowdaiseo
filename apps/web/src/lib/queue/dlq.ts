import type { Job, Worker } from "bullmq";
import { logger } from "@/lib/logger";
import { queues } from "./queues";
import { captureException } from "@/lib/observability/sentry";

export type DlqEntry = {
  originQueue: string;
  jobId: string | undefined;
  jobName: string;
  payload: unknown;
  error: string;
  attemptsMade: number;
  failedAt: string;
};

/**
 * Attach a `failed` listener to a worker that, after all retries are
 * exhausted, writes a copy of the job into the dead-letter queue for
 * human inspection / replay.
 *
 * BullMQ signals exhaustion by setting `job.attemptsMade >= job.opts.attempts`.
 */
export function attachDlq(worker: Worker, queueName: string): void {
  worker.on("failed", async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return; // still has retries left

    const entry: DlqEntry = {
      originQueue: queueName,
      jobId: job.id,
      jobName: job.name,
      payload: job.data,
      error: err.message,
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
    };

    try {
      await queues.dlq.add(`${queueName}-${job.name}`, entry, {
        jobId: `dlq-${queueName}-${job.id ?? Date.now()}`,
      });
      logger.error(
        { originQueue: queueName, jobId: job.id, err: err.message },
        "job moved to DLQ after exhausting retries",
      );
    } catch (dlqErr) {
      logger.error(
        { originQueue: queueName, jobId: job.id, dlqErr },
        "failed to write to DLQ",
      );
    }

    captureException(err, { queue: queueName, jobId: job.id, payload: job.data });
  });
}
