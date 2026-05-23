import "server-only";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderAdapter,
} from "../types";

export const openaiAdapter: AiProviderAdapter = {
  name: "openai",
  async complete(_req: AiCompletionRequest): Promise<AiCompletionResponse> {
    throw new Error("openaiAdapter.complete not implemented");
  },
};
