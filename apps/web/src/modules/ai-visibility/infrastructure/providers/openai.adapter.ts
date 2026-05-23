import type { ProviderAdapter } from "../../domain/ports";
import type { LLMRequest, LLMResponse } from "../../domain/entities";
import { providerError } from "./errors";
import { beforeCall, onSuccess, onFailure } from "@/lib/ai/circuit-breaker";
import { observe } from "@/lib/observability/metrics";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export const createOpenAIAdapter = (apiKey: string): ProviderAdapter => ({
  id: "OPENAI",
  async invoke(req: LLMRequest): Promise<LLMResponse> {
    beforeCall("OPENAI");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60_000);
    const started = Date.now();
    try {
      const res = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: req.model,
          messages: [{ role: "user", content: req.prompt }],
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 1024,
        }),
      });
      if (!res.ok) {
        onFailure("OPENAI");
        throw providerError(
          "OPENAI",
          res.status,
          await res.text().catch(() => ""),
          res.headers.get("Retry-After"),
        );
      }
      const body = (await res.json()) as {
        choices: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = body.choices?.[0];
      onSuccess("OPENAI");
      observe("provider_latency_ms", Date.now() - started, { provider: "OPENAI" });
      return {
        text: choice?.message?.content ?? "",
        raw: body,
        usage: {
          inputTokens: body.usage?.prompt_tokens,
          outputTokens: body.usage?.completion_tokens,
        },
        finishReason: choice?.finish_reason,
      };
    } catch (err) {
      if ((err as { name?: string }).name !== "ProviderError") onFailure("OPENAI");
      throw err;
    } finally {
      clearTimeout(t);
    }
  },
});
