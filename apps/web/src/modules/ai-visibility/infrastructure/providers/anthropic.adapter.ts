import type { ProviderAdapter } from "../../domain/ports";
import type { LLMRequest, LLMResponse } from "../../domain/entities";
import { providerError } from "./errors";
import { beforeCall, onSuccess, onFailure } from "@/lib/ai/circuit-breaker";
import { observe } from "@/lib/observability/metrics";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";

export const createAnthropicAdapter = (apiKey: string): ProviderAdapter => ({
  id: "ANTHROPIC",
  async invoke(req: LLMRequest): Promise<LLMResponse> {
    beforeCall("ANTHROPIC");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60_000);
    const started = Date.now();
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": VERSION,
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.2,
          messages: [{ role: "user", content: req.prompt }],
        }),
      });
      if (!res.ok) {
        onFailure("ANTHROPIC");
        throw providerError(
          "ANTHROPIC",
          res.status,
          await res.text().catch(() => ""),
          res.headers.get("Retry-After"),
        );
      }
      const body = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string;
      };
      const text = body.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n")
        .trim();
      onSuccess("ANTHROPIC");
      observe("provider_latency_ms", Date.now() - started, { provider: "ANTHROPIC" });
      return {
        text: text ?? "",
        raw: body,
        usage: {
          inputTokens: body.usage?.input_tokens,
          outputTokens: body.usage?.output_tokens,
        },
        finishReason: body.stop_reason,
      };
    } catch (err) {
      if ((err as { name?: string }).name !== "ProviderError") onFailure("ANTHROPIC");
      throw err;
    } finally {
      clearTimeout(t);
    }
  },
});
