import type { ProviderId } from "@prisma/client";
import { queues } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { MODELS } from "../domain/providers";
import type {
  EntityResolver,
  ProviderRegistry,
  PromptStore,
  RateLimiter,
  ResponseCache,
  ScanRepository,
} from "../domain/ports";
import type {
  LLMResponse,
  RunAnalysis,
  RunOutcome,
} from "../domain/entities";
import { renderPrompt } from "./prompt-engine";
import { detectMentions, extractCitations, rankBrand } from "./parser";
import { analyzeSentiment } from "./sentiment";
import { scoreScan } from "./scorer";
import { cacheKey } from "../infrastructure/response-cache";
import { ProviderError } from "../infrastructure/providers/errors";
import { runIntelligencePipeline } from "../intelligence/application/pipeline";
import { prisma } from "@/lib/prisma/client";

export type OrchestratorDeps = {
  prompts: PromptStore;
  repo: ScanRepository;
  registry: ProviderRegistry;
  cache: ResponseCache;
  rateLimiter: RateLimiter;
  entities: EntityResolver;
};

// ------------------------------------------------------------------
// Scan-level: seed runs (one per prompt × provider)
// ------------------------------------------------------------------

export const handleScanStart = async (
  deps: OrchestratorDeps,
  payload: {
    scanId: string;
    workspaceId: string;
    projectId: string;
    promptIds: string[];
    providers: ProviderId[];
  },
) => {
  const { prompts, repo, registry } = deps;
  await repo.startScan(payload.scanId);

  const available = new Set(registry.available());
  const providers = payload.providers.filter((p) => available.has(p));
  if (providers.length === 0) {
    throw new Error("No providers configured (set API keys in env).");
  }

  let enqueued = 0;
  for (const promptId of payload.promptIds) {
    const prompt = await prompts.getActive(promptId);
    if (!prompt) {
      logger.warn(
        { scanId: payload.scanId, promptId },
        "scan.start: prompt missing or has no version",
      );
      continue;
    }
    for (const provider of providers) {
      const model = MODELS[provider].model;
      const { id: runId, created } = await repo.upsertQueuedRun({
        scanId: payload.scanId,
        workspaceId: payload.workspaceId,
        promptId: prompt.id,
        promptVersion: prompt.version,
        provider,
        model,
      });
      if (!created) continue;
      await queues.aiPromptRun.add(
        "run",
        {
          workspaceId: payload.workspaceId,
          promptId: prompt.id,
          provider: providerToString(provider),
          metadata: {
            scanId: payload.scanId,
            runId,
            promptVersion: prompt.version,
            projectId: payload.projectId,
            model,
          },
        },
        { jobId: `aiv-${runId}` },
      );
      enqueued++;
    }
  }

  logger.info(
    { scanId: payload.scanId, enqueued, providers },
    "scan.start: runs queued",
  );
  return { enqueued, providers };
};

// ------------------------------------------------------------------
// Run-level: execute one prompt × provider, persist, analyze
// ------------------------------------------------------------------

export const handlePromptRun = async (
  deps: OrchestratorDeps,
  payload: {
    scanId: string;
    runId: string;
    workspaceId: string;
    projectId: string;
    promptId: string;
    promptVersion: number;
    provider: ProviderId;
    model: string;
  },
) => {
  const { prompts, repo, registry, cache, rateLimiter, entities } = deps;

  const prompt =
    (await prompts.getVersion(payload.promptId, payload.promptVersion)) ??
    (await prompts.getActive(payload.promptId));
  if (!prompt) {
    await repo.markRunFailed(payload.runId, "Prompt deleted before run");
    return { failed: true };
  }

  // Variables — for now use a minimal substitution map. Real callers
  // can stash these in the prompt's variables payload and pass per-scan
  // overrides through the queue metadata.
  const projectEntities = await entities.forProject(payload.projectId);
  const variables: Record<string, string> = {
    brand: projectEntities.brand.name,
    domain: projectEntities.brand.aliases[0] ?? "",
  };

  const rendered = renderPrompt(prompt, variables, payload.provider);

  // ---- Cache lookup -------------------------------------------------
  const ck = cacheKey(payload.provider, rendered.contentHash);
  const cached = await cache.get(ck);
  if (cached) {
    const outcome = await finalizeRun({
      response: cached,
      cached: true,
      latencyMs: 0,
      provider: payload.provider,
      model: payload.model,
      runId: payload.runId,
      scanId: payload.scanId,
      entities: projectEntities,
      repo,
    });
    return outcome;
  }

  // ---- Provider call ------------------------------------------------
  await rateLimiter.acquire(`aiv:${payload.provider}`);
  const adapter = registry.get(payload.provider);
  const started = Date.now();

  let response: LLMResponse;
  try {
    response = await adapter.invoke({
      prompt: rendered.content,
      model: payload.model,
      temperature: 0.2,
      maxTokens: 1024,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "provider-failed";
    // Re-throw retryable errors so BullMQ schedules another attempt.
    // For 429s, honour Retry-After by setting a custom BullMQ delay on
    // the error so the worker's exponential backoff uses the correct floor.
    if (err instanceof ProviderError && err.retryable) {
      logger.warn(
        {
          runId: payload.runId,
          provider: payload.provider,
          retryAfterMs: err.retryAfterMs,
          err: msg,
        },
        "prompt-run: retryable provider error",
      );
      if (err.retryAfterMs) {
        // BullMQ checks err.delay (number) to override the backoff delay.
        (err as Error & { delay?: number }).delay = err.retryAfterMs;
      }
      throw err;
    }
    await repo.saveRunOutcome(
      payload.runId,
      payload.scanId,
      {
        provider: payload.provider,
        model: payload.model,
        status: "FAILED",
        response: null,
        latencyMs: Date.now() - started,
        cached: false,
        error: msg,
      },
      null,
    );
    return { failed: true, error: msg };
  }

  const latencyMs = Date.now() - started;

  // Cache successful responses (24h default).
  await cache.set(ck, response).catch(() => null);

  return finalizeRun({
    response,
    cached: false,
    latencyMs,
    provider: payload.provider,
    model: payload.model,
    runId: payload.runId,
    scanId: payload.scanId,
    entities: projectEntities,
    repo,
  });
};

// ------------------------------------------------------------------
// Score finalization — called when the page worker drains or by a
// dedicated event listener.
// ------------------------------------------------------------------

export const tryFinalizeScan = async (
  deps: OrchestratorDeps,
  scanId: string,
) => {
  const counts = await deps.repo.countScanRuns(scanId);
  if (counts.total === 0) return { finalized: false };
  if (counts.completed + counts.failed < counts.total) {
    return { finalized: false };
  }
  const samples = await deps.repo.loadCompletedRuns(scanId);
  const score = scoreScan(samples);
  // Atomic guard: updateMany with status filter ensures only one concurrent
  // worker finalizes the scan. The WHERE clause includes status: "RUNNING"
  // so a second call after the first succeeds is a no-op (count = 0).
  const finalized = await deps.repo.finishScanIfRunning(scanId, {
    status: "COMPLETED",
    score,
  });
  if (finalized) {
    logger.info({ scanId, score: score.total }, "scan finalized");
    // Fire the intelligence pipeline once per finalization. Errors here
    // must not roll back the scan — we already wrote the score. The
    // pipeline is idempotent on (project, day) so a re-run is safe.
    try {
      const scan = await prisma.visibilityScan.findUnique({
        where: { id: scanId },
        select: { workspaceId: true, projectId: true },
      });
      if (scan) {
        await runIntelligencePipeline({
          workspaceId: scan.workspaceId,
          projectId: scan.projectId,
          scanId,
        });
      }
    } catch (err) {
      logger.error(
        { scanId, err: err instanceof Error ? err.message : err },
        "intelligence pipeline failed (scan already finalized)",
      );
    }
  }
  return { finalized, score };
};

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

const finalizeRun = async (input: {
  response: LLMResponse;
  cached: boolean;
  latencyMs: number;
  provider: ProviderId;
  model: string;
  runId: string;
  scanId: string;
  entities: Awaited<ReturnType<EntityResolver["forProject"]>>;
  repo: ScanRepository;
}) => {
  const mentions = detectMentions(
    input.response.text,
    input.entities.brand,
    input.entities.competitors,
  );
  const citations = extractCitations(input.response);
  const brandRank = rankBrand(mentions);
  const sentiment = analyzeSentiment(input.response.text, mentions);

  const analysis: RunAnalysis = {
    brandMentioned: mentions.some((m) => m.kind === "BRAND"),
    brandRank,
    mentions,
    citations,
    sentiment,
  };

  const outcome: RunOutcome = {
    provider: input.provider,
    model: input.model,
    status: input.cached ? "CACHED" : "COMPLETED",
    response: input.response,
    latencyMs: input.latencyMs,
    cached: input.cached,
    costUsd: estimateCost(input.provider, input.response),
  };

  await input.repo.saveRunOutcome(
    input.runId,
    input.scanId,
    outcome,
    analysis,
  );
  return {
    runId: input.runId,
    brandMentioned: analysis.brandMentioned,
    brandRank,
    mentions: mentions.length,
    citations: citations.length,
  };
};

const estimateCost = (
  provider: ProviderId,
  response: LLMResponse,
): number | undefined => {
  const m = MODELS[provider];
  const inT = response.usage?.inputTokens;
  const outT = response.usage?.outputTokens;
  if (inT === undefined || outT === undefined) return undefined;
  return (
    (inT / 1_000_000) * m.inputCostPerMTokens +
    (outT / 1_000_000) * m.outputCostPerMTokens
  );
};

const providerToString = (
  p: ProviderId,
): "anthropic" | "openai" | "google" | "perplexity" => {
  switch (p) {
    case "ANTHROPIC":
      return "anthropic";
    case "OPENAI":
      return "openai";
    case "GOOGLE":
      return "google";
    case "PERPLEXITY":
      return "perplexity";
  }
};
