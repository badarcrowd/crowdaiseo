import type { ProviderAdapter } from "../../domain/ports";
import type { LLMRequest, LLMResponse } from "../../domain/entities";
import { providerError } from "./errors";
import { beforeCall, onSuccess, onFailure } from "@/lib/ai/circuit-breaker";
import { observe } from "@/lib/observability/metrics";

const ENDPOINT_TEMPLATE = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

export const createGoogleAdapter = (apiKey: string): ProviderAdapter => ({
  id: "GOOGLE",
  async invoke(req: LLMRequest): Promise<LLMResponse> {
    beforeCall("GOOGLE");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60_000);
    const started = Date.now();
    try {
      const res = await fetch(ENDPOINT_TEMPLATE(req.model, apiKey), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            temperature: req.temperature ?? 0.2,
            maxOutputTokens: req.maxTokens ?? 1024,
          },
        }),
      });
      if (!res.ok) {
        onFailure("GOOGLE");
        throw providerError(
          "GOOGLE",
          res.status,
          await res.text().catch(() => ""),
          res.headers.get("Retry-After"),
        );
      }
      const body = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
        };
      };
      const text =
        body.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("\n") ?? "";
      onSuccess("GOOGLE");
      observe("provider_latency_ms", Date.now() - started, { provider: "GOOGLE" });
      return {
        text,
        raw: body,
        usage: {
          inputTokens: body.usageMetadata?.promptTokenCount,
          outputTokens: body.usageMetadata?.candidatesTokenCount,
        },
        finishReason: body.candidates?.[0]?.finishReason,
      };
    } catch (err) {
      if ((err as { name?: string }).name !== "ProviderError") onFailure("GOOGLE");
      throw err;
    } finally {
      clearTimeout(t);
    }
  },
});
