import "server-only";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiProviderAdapter,
} from "./types";
import { logger } from "@/lib/logger";

/**
 * Central orchestrator. Real-world responsibilities (not yet implemented):
 *  - Pick the best provider for a task (cost / capability / availability).
 *  - Apply per-workspace rate limits and budgets.
 *  - Fan out the same prompt to multiple providers for AI-Visibility scans.
 *  - Record token usage and latency to the `jobs` / billing tables.
 *  - Retry with a fallback provider on transient failures.
 */
class AiOrchestrator {
  private adapters = new Map<AiProvider, AiProviderAdapter>();

  register(adapter: AiProviderAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  has(provider: AiProvider): boolean {
    return this.adapters.has(provider);
  }

  async complete(
    provider: AiProvider,
    req: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`AI provider not registered: ${provider}`);
    }
    const started = Date.now();
    try {
      const result = await adapter.complete(req);
      logger.info(
        {
          provider,
          model: req.model,
          latencyMs: result.latencyMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
        "ai.complete",
      );
      return result;
    } catch (err) {
      logger.error(
        { provider, model: req.model, elapsedMs: Date.now() - started, err },
        "ai.complete failed",
      );
      throw err;
    }
  }

  /**
   * Fan out to many providers in parallel (used by AI-Visibility scans).
   */
  async multiComplete(
    providers: AiProvider[],
    req: AiCompletionRequest,
  ): Promise<AiCompletionResponse[]> {
    return Promise.all(providers.map((p) => this.complete(p, req)));
  }
}

export const aiOrchestrator = new AiOrchestrator();
