import type { ProviderId } from "@prisma/client";
import type {
  LLMRequest,
  LLMResponse,
  PromptInput,
  RunAnalysis,
  RunOutcome,
  VisibilityScore,
} from "./entities";

/**
 * Provider adapter: the only seam between the orchestrator and a
 * specific LLM vendor. Every adapter implements this same shape, so
 * `runOne()` is provider-agnostic.
 */
export interface ProviderAdapter {
  readonly id: ProviderId;
  invoke(req: LLMRequest): Promise<LLMResponse>;
}

/**
 * Provider lookup. Implementations may lazily construct adapters (e.g.
 * only initialize a client when an API key is present).
 */
export interface ProviderRegistry {
  get(id: ProviderId): ProviderAdapter;
  available(): ProviderId[];
}

/**
 * Response cache. Keyed by (provider + content hash) so identical
 * prompts to the same model dedupe across scans within the TTL window.
 */
export interface ResponseCache {
  get(key: string): Promise<LLMResponse | null>;
  set(key: string, value: LLMResponse, ttlSeconds?: number): Promise<void>;
}

/**
 * Rate limiter: shared with the crawler. Keyed by provider id so each
 * vendor has its own bucket (OpenAI and Anthropic don't share quotas).
 */
export interface RateLimiter {
  acquire(key: string, opts?: { timeoutMs?: number }): Promise<void>;
}

/**
 * Prompt store / versioning.
 */
export interface PromptStore {
  getActive(promptId: string): Promise<PromptInput | null>;
  getVersion(promptId: string, version: number): Promise<PromptInput | null>;
  listForProject(projectId: string): Promise<PromptInput[]>;
}

/**
 * Persistence for scans + runs.
 */
export interface ScanRepository {
  startScan(scanId: string): Promise<void>;
  finishScan(
    scanId: string,
    outcome: {
      status: "COMPLETED" | "FAILED" | "CANCELLED";
      score?: VisibilityScore;
      error?: string;
    },
  ): Promise<void>;
  /** Atomic finalization — only transitions from RUNNING. Returns true if updated. */
  finishScanIfRunning(
    scanId: string,
    outcome: {
      status: "COMPLETED" | "FAILED" | "CANCELLED";
      score?: VisibilityScore;
      error?: string;
    },
  ): Promise<boolean>;
  countScanRuns(
    scanId: string,
  ): Promise<{ total: number; completed: number; failed: number }>;
  upsertQueuedRun(input: {
    scanId: string;
    workspaceId: string;
    promptId: string;
    promptVersion: number;
    provider: ProviderId;
    model: string;
  }): Promise<{ id: string; created: boolean }>;
  saveRunOutcome(
    runId: string,
    scanId: string,
    outcome: RunOutcome,
    analysis: RunAnalysis | null,
  ): Promise<void>;
  markRunFailed(runId: string, error: string): Promise<void>;
  loadCompletedRuns(scanId: string): Promise<
    Array<{
      provider: ProviderId;
      brandMentioned: boolean;
      brandRank: number | null;
      sentimentScore: number | null;
      citationCount: number;
    }>
  >;
}

/**
 * Entity vocabulary for a project — used by the parser to detect brand
 * + competitor mentions in LLM responses.
 */
export interface EntityResolver {
  forProject(projectId: string): Promise<{
    brand: { name: string; aliases: string[] };
    competitors: Array<{ name: string; aliases: string[] }>;
  }>;
}
