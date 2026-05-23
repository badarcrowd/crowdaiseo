import { Queue, QueueEvents } from "bullmq";
import { serverEnv } from "@/config/env";
import { createQueueConnection } from "./connection";

/**
 * Queue registry. Add a new queue here, define its job payload type in
 * `./types.ts`, and add a processor under `./workers/`.
 *
 * Naming convention: `<domain>.<action>` — e.g. `crawl.page`.
 * 
 * Queues are lazily initialized to avoid Redis connections during build.
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

// Cache for lazy-loaded queues
let _queues: typeof queues | null = null;
let _queueEvents: typeof queueEvents | null = null;

function createQueues() {
  const connection = createQueueConnection();
  if (!connection) {
    // Return mock queues during build
    return null;
  }

  const opts = (overrides: Partial<typeof baseDefaults> = {}) => ({
    connection,
    prefix,
    defaultJobOptions: { ...baseDefaults, ...overrides },
  });

  return {
    aiVisibilityScan: new Queue(QUEUE_NAMES.AI_VISIBILITY_SCAN, opts()),
    seoAudit: new Queue(QUEUE_NAMES.SEO_AUDIT, opts()),
    aiPromptRun: new Queue(QUEUE_NAMES.AI_PROMPT_RUN, opts()),
    notificationSend: new Queue(QUEUE_NAMES.NOTIFICATION_SEND, opts()),
    crawlStart: new Queue(QUEUE_NAMES.CRAWL_START, opts({ attempts: 2 })),
    crawlPage: new Queue(QUEUE_NAMES.CRAWL_PAGE, opts({
      attempts: 5,
      backoff: { type: "exponential", delay: 10_000 },
    })),
    reportGenerate: new Queue(QUEUE_NAMES.REPORT_GENERATE, opts({
      attempts: 4,
      backoff: { type: "exponential", delay: 15_000 },
    })),
    reportScheduleTick: new Queue(QUEUE_NAMES.REPORT_SCHEDULE_TICK, opts({
      attempts: 1,
      removeOnComplete: { age: 60 * 60, count: 100 },
    })),
    executiveInsightWeeklyTick: new Queue(
      QUEUE_NAMES.EXECUTIVE_INSIGHT_WEEKLY_TICK,
      opts({
        attempts: 2,
        removeOnComplete: { age: 60 * 60 * 24, count: 50 },
      }),
    ),
    dlq: new Queue(QUEUE_NAMES.DLQ, {
      connection,
      prefix,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: { age: 60 * 60 * 24 * 30 },
      },
    }),
  } as const;
}

function createQueueEvents() {
  const connection = createQueueConnection();
  if (!connection) return null;

  return {
    aiVisibilityScan: new QueueEvents(QUEUE_NAMES.AI_VISIBILITY_SCAN, {
      connection,
      prefix,
    }),
    crawlStart: new QueueEvents(QUEUE_NAMES.CRAWL_START, {
      connection: createQueueConnection()!,
      prefix,
    }),
  } as const;
}

// Lazy getters
export function getQueues() {
  if (_queues === null) {
    _queues = createQueues() as typeof queues;
  }
  return _queues;
}

export function getQueueEvents() {
  if (_queueEvents === null) {
    _queueEvents = createQueueEvents() as typeof queueEvents;
  }
  return _queueEvents;
}

// Legacy exports for backward compatibility - will be null during build
// Use getQueues() and getQueueEvents() instead for safe access
export const queues = null as unknown as NonNullable<ReturnType<typeof createQueues>>;
export const queueEvents = null as unknown as NonNullable<ReturnType<typeof createQueueEvents>>;
