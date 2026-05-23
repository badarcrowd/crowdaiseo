import type { ProviderId } from "@prisma/client";
import { serverEnv } from "@/config/env";
import type { ProviderAdapter, ProviderRegistry } from "../../domain/ports";
import { createOpenAIAdapter } from "./openai.adapter";
import { createAnthropicAdapter } from "./anthropic.adapter";
import { createGoogleAdapter } from "./google.adapter";
import { createPerplexityAdapter } from "./perplexity.adapter";

const adapters: Partial<Record<ProviderId, ProviderAdapter>> = {};

const build = (id: ProviderId): ProviderAdapter | null => {
  switch (id) {
    case "OPENAI":
      return serverEnv.OPENAI_API_KEY
        ? createOpenAIAdapter(serverEnv.OPENAI_API_KEY)
        : null;
    case "ANTHROPIC":
      return serverEnv.ANTHROPIC_API_KEY
        ? createAnthropicAdapter(serverEnv.ANTHROPIC_API_KEY)
        : null;
    case "GOOGLE":
      return serverEnv.GOOGLE_AI_API_KEY
        ? createGoogleAdapter(serverEnv.GOOGLE_AI_API_KEY)
        : null;
    case "PERPLEXITY":
      return serverEnv.PERPLEXITY_API_KEY
        ? createPerplexityAdapter(serverEnv.PERPLEXITY_API_KEY)
        : null;
  }
};

export const providerRegistry: ProviderRegistry = {
  get(id) {
    if (!adapters[id]) {
      const built = build(id);
      if (!built) {
        throw new Error(
          `Provider ${id} not configured — set its API key in env.`,
        );
      }
      adapters[id] = built;
    }
    return adapters[id]!;
  },
  available() {
    return (["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"] as const).filter(
      (id) => !!build(id),
    );
  },
};
