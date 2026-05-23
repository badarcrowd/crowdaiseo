/**
 * Provider-agnostic types for the AI orchestrator. Each concrete provider
 * adapter normalizes its responses to these types so callers never deal
 * with vendor SDK shapes directly.
 */

export type AiProvider = "anthropic" | "openai" | "google" | "perplexity";

export type AiRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompletionRequest = {
  model: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
};

export type AiCompletionResponse = {
  provider: AiProvider;
  model: string;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  latencyMs: number;
  raw?: unknown;
};

export interface AiProviderAdapter {
  readonly name: AiProvider;
  complete(req: AiCompletionRequest): Promise<AiCompletionResponse>;
}
