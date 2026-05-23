import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, queues } from "../queues";
import { createQueueConnection } from "../connection";
import { attachDlq } from "../dlq";
import type {
  AiPromptRunPayload,
  AiVisibilityScanPayload,
} from "../types";
import { logger } from "@/lib/logger";
import { serverEnv } from "@/config/env";
import { inc, observe } from "@/lib/observability/metrics";
import {
  handleScanStart,
  handlePromptRun,
  tryFinalizeScan,
  type OrchestratorDeps,
} from "@/modules/ai-visibility/application/orchestrator";
import { promptStore } from "@/modules/ai-visibility/infrastructure/prompt.store";
import { scanRepository } from "@/modules/ai-visibility/infrastructure/scan.repository";
import { providerRegistry } from "@/modules/ai-visibility/infrastructure/providers/registry";
import { responseCache } from "@/modules/ai-visibility/infrastructure/response-cache";
import { entityResolver } from "@/modules/ai-visibility/infrastructure/entity-resolver";
import { createRateLimiter } from "@/modules/crawler/infrastructure/rate-limiter";

const rateLimiter = createRateLimiter({
  capacity: Number(process.env.AIV_RATE_CAPACITY ?? 10),
  refillPerSec: Number(process.env.AIV_RATE_REFILL ?? 5),
  prefix: "rl:aiv",
});

const deps: OrchestratorDeps = {
  prompts: promptStore,
  repo: scanRepository,
  registry: providerRegistry,
  cache: responseCache,
  rateLimiter,
  entities: entityResolver,
};

// ------------------------------------------------------------------
// Scan-start worker: one job per scan, fans out per prompt × provider.
// ------------------------------------------------------------------
export const aiVisibilityScanWorker = new Worker<AiVisibilityScanPayload>(
  QUEUE_NAMES.AI_VISIBILITY_SCAN,
  async (job: Job<AiVisibilityScanPayload>) => {
    const log = logger.child({ jobId: job.id, scanId: job.data.scanId });
    log.info("scan.start");
    const started = Date.now();
    try {
      const result = await handleScanStart(deps, job.data);
      observe("aiv_scan_start_ms", Date.now() - started, {});
      inc("aiv_scan_started_total");
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      log.error({ err: msg }, "scan.start failed");
      inc("aiv_scan_failed_total");
      await scanRepository.finishScan(job.data.scanId, {
        status: "FAILED",
        error: msg,
      });
      throw err;
    }
  },
  {
    connection: createQueueConnection(),
    prefix: serverEnv.QUEUE_PREFIX,
    concurrency: 3,
    // Generous lock: scan-start fans out prompts × providers and can take
    // 10-30s; default 30s would cause false stalls.
    lockDuration: 120_000,
  },
);

// ------------------------------------------------------------------
// Prompt-run worker: one job per (prompt × provider) call.
//
// Concurrency is global per process; the per-provider rate limiter is
// the *real* throttle. This way you can deploy many workers and the
// vendor never sees more than the configured rps.
// ------------------------------------------------------------------
export const aiPromptRunWorker = new Worker<AiPromptRunPayload>(
  QUEUE_NAMES.AI_PROMPT_RUN,
  async (job: Job<AiPromptRunPayload>) => {
    const meta = job.data.metadata as
      | {
          scanId: string;
          runId: string;
          promptVersion: number;
          projectId: string;
          model: string;
        }
      | undefined;
    if (!meta) throw new Error("aiPromptRun: missing metadata");

    const log = logger.child({
      jobId: job.id,
      runId: meta.runId,
      scanId: meta.scanId,
      provider: job.data.provider,
    });
    log.debug("prompt-run starting");

    const started = Date.now();
    try {
      const result = await handlePromptRun(deps, {
        scanId: meta.scanId,
        runId: meta.runId,
        workspaceId: job.data.workspaceId,
        projectId: meta.projectId,
        promptId: job.data.promptId,
        promptVersion: meta.promptVersion,
        provider: providerFromString(job.data.provider),
        model: meta.model,
      });
      const ms = Date.now() - started;
      observe("aiv_prompt_run_ms", ms, { provider: job.data.provider });
      inc("aiv_prompt_run_completed_total", { provider: job.data.provider });
      await tryFinalizeScan(deps, meta.scanId).catch((err) => {
        logger.error(
          { scanId: meta.scanId, err: err instanceof Error ? err.message : err },
          "scan finalize failed",
        );
      });
      return result;
    } catch (err) {
      inc("aiv_prompt_run_failed_total", { provider: job.data.provider });
      throw err;
    }
  },
  {
    connection: createQueueConnection(),
    prefix: serverEnv.QUEUE_PREFIX,
    concurrency: Number(process.env.AIV_WORKER_CONCURRENCY ?? 8),
    // lockDuration must exceed the per-provider HTTP timeout (60s) plus
    // rate-limiter wait time. 120s gives comfortable headroom.
    lockDuration: 120_000,
    // Soft global cap to protect Redis from runaway fan-outs.
    limiter: { max: 100, duration: 1000 },
  },
);

aiPromptRunWorker.on("failed", (job, err) =>
  logger.warn(
    {
      runId: (job?.data?.metadata as { runId?: string } | undefined)?.runId,
      provider: job?.data?.provider,
      attempts: job?.attemptsMade,
      err: err.message,
    },
    "ai.prompt-run failed",
  ),
);

// Attach dead-letter queues — jobs that exhaust all retries land here.
attachDlq(aiVisibilityScanWorker, QUEUE_NAMES.AI_VISIBILITY_SCAN);
attachDlq(aiPromptRunWorker, QUEUE_NAMES.AI_PROMPT_RUN);

// On drain, opportunistically finalize any scans whose runs are done.
aiPromptRunWorker.on("drained", async () => {
  const counts = await queues.aiPromptRun.getJobCounts(
    "waiting",
    "active",
    "delayed",
  );
  if ((counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0) > 0) return;
  const { prisma } = await import("@/lib/prisma/client");
  const running = await prisma.visibilityScan.findMany({
    where: { status: "RUNNING" },
    select: { id: true },
    take: 50,
  });
  for (const s of running) {
    await tryFinalizeScan(deps, s.id).catch((err) => {
      logger.error({ scanId: s.id, err: err.message }, "scan finalize failed");
    });
  }
});

const providerFromString = (
  s: AiPromptRunPayload["provider"],
): "OPENAI" | "ANTHROPIC" | "GOOGLE" | "PERPLEXITY" => {
  switch (s) {
    case "openai":
      return "OPENAI";
    case "anthropic":
      return "ANTHROPIC";
    case "google":
      return "GOOGLE";
    case "perplexity":
      return "PERPLEXITY";
  }
};
