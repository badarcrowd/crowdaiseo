import { Queue, QueueEvents } from "bullmq";
import { serverEnv } from "@/config/env";
import { createQueueConnection } from "./connection";

/**
 * Queue registry. Add a new queue here, define its job payload type in
 * `./types.ts`, and add a processor under `./workers/`.
 *
 * Naming convention: `<domain>.<action>` — e.g. `crawl.page`.
 */
export const QUEUE_NAMES = {
  AI_VISIBILITY_SCAN: "ai-visibility.scan",
  SEO_AUDIT: "seo.audit",
  AI_PROMPT_RUN: "ai.prompt-run",
  NOTIFICATION_SEND: "notification.send",
  CRAWL_START: "crawl.start",
  CRAWL_PAGE: "crawl.page",
  // Reports: one job per report; the scheduler enqueues these on cron.
  REPORT_GENERATE: "report.generate",
  // Scheduler tick: runs every minute to fan out due schedules.
  REPORT_SCHEDULE_TICK: "report.schedule-tick",
  // Weekly tick: fires every Monday to run the executive insight pipeline
  // for all active projects, ensuring summaries generate without a scan.
  EXECUTIVE_INSIGHT_WEEKLY_TICK: "executive-insight.weekly-tick",
  // Dead-letter queue — receives copies of jobs that exhausted all retries.
  DLQ: "dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const prefix = serverEnv.QUEUE_PREFIX;

const baseDefaults = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

const opts = (overrides: Partial<typeof baseDefaults> = {}) => ({
  connection: createQueueConnection(),
  prefix,
  defaultJobOptions: { ...baseDefaults, ...overrides },
});

export const queues = {
  aiVisibilityScan: new Queue(QUEUE_NAMES.AI_VISIBILITY_SCAN, opts()),
  seoAudit: new Queue(QUEUE_NAMES.SEO_AUDIT, opts()),
  aiPromptRun: new Queue(QUEUE_NAMES.AI_PROMPT_RUN, opts()),
  notificationSend: new Queue(QUEUE_NAMES.NOTIFICATION_SEND, opts()),
  // Crawl orchestrator job — one per crawl. Light: just fetches
  // robots/sitemap and seeds the frontier.
  crawlStart: new Queue(QUEUE_NAMES.CRAWL_START, opts({ attempts: 2 })),
  // Per-page fetch + parse. Higher attempts because transient network
  // failures are common; longer backoff to play nicely with origin rate
  // limits.
  crawlPage: new Queue(QUEUE_NAMES.CRAWL_PAGE, opts({
    attempts: 5,
    backoff: { type: "exponential", delay: 10_000 },
  })),
  // Report generation — PDF render + storage upload + email delivery.
  // High retry count because Playwright can flake transiently.
  reportGenerate: new Queue(QUEUE_NAMES.REPORT_GENERATE, opts({
    attempts: 4,
    backoff: { type: "exponential", delay: 15_000 },
  })),
  // Schedule tick — emits a single repeatable job (configured at boot)
  // that fans out due schedules.
  reportScheduleTick: new Queue(QUEUE_NAMES.REPORT_SCHEDULE_TICK, opts({
    attempts: 1,
    removeOnComplete: { age: 60 * 60, count: 100 },
  })),
  // Executive insight weekly tick — fires every Monday at 08:00 UTC.
  executiveInsightWeeklyTick: new Queue(
    QUEUE_NAMES.EXECUTIVE_INSIGHT_WEEKLY_TICK,
    opts({
      attempts: 2,
      removeOnComplete: { age: 60 * 60 * 24, count: 50 },
    }),
  ),
  // Dead-letter queue — keep failed jobs 30 days for inspection/replay.
  dlq: new Queue(QUEUE_NAMES.DLQ, {
    connection: createQueueConnection(),
    prefix,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: { age: 60 * 60 * 24 * 30 },
    },
  }),
} as const;

export const queueEvents = {
  aiVisibilityScan: new QueueEvents(QUEUE_NAMES.AI_VISIBILITY_SCAN, {
    connection: createQueueConnection(),
    prefix,
  }),
  crawlStart: new QueueEvents(QUEUE_NAMES.CRAWL_START, {
    connection: createQueueConnection(),
    prefix,
  }),
} as const;
