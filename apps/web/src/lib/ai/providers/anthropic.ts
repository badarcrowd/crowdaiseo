import "server-only";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderAdapter,
} from "../types";

/**
 * Anthropic adapter — placeholder. Wire up `@anthropic-ai/sdk` here.
 */
export const anthropicAdapter: AiProviderAdapter = {
  name: "anthropic",
  async complete(_req: AiCompletionRequest): Promise<AiCompletionResponse> {
    throw new Error("anthropicAdapter.complete not implemented");
  },
};
