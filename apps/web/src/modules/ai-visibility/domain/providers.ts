import type { ProviderId } from "@prisma/client";

/**
 * Canonical model registry. Adding a new provider/model is just a row
 * here plus an adapter under `infrastructure/providers/`.
 *
 * `supportsCitations` indicates whether the provider returns first-class
 * citation metadata (vs. inline URLs we have to parse from prose).
 */
export type ProviderModel = {
  provider: ProviderId;
  model: string;
  label: string;
  supportsCitations: boolean;
  contextWindow: number;
  inputCostPerMTokens: number;
  outputCostPerMTokens: number;
};

export const MODELS: Record<ProviderId, ProviderModel> = {
  OPENAI: {
    provider: "OPENAI",
    model: "gpt-4o",
    label: "GPT-4o",
    supportsCitations: false,
    contextWindow: 128_000,
    inputCostPerMTokens: 2.5,
    outputCostPerMTokens: 10,
  },
  ANTHROPIC: {
    provider: "ANTHROPIC",
    model: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    supportsCitations: false,
    contextWindow: 200_000,
    inputCostPerMTokens: 3,
    outputCostPerMTokens: 15,
  },
  GOOGLE: {
    provider: "GOOGLE",
    model: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    supportsCitations: false,
    contextWindow: 2_000_000,
    inputCostPerMTokens: 1.25,
    outputCostPerMTokens: 5,
  },
  PERPLEXITY: {
    provider: "PERPLEXITY",
    model: "sonar-pro",
    label: "Perplexity Sonar Pro",
    supportsCitations: true,
    contextWindow: 128_000,
    inputCostPerMTokens: 3,
    outputCostPerMTokens: 15,
  },
};

export const ALL_PROVIDERS: ProviderId[] = [
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
  "PERPLEXITY",
];
