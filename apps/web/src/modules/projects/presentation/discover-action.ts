"use server";

import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { providerRegistry } from "@/modules/ai-visibility/infrastructure/providers/registry";
import { MODELS } from "@/modules/ai-visibility/domain/providers";
import type { ProviderId } from "@prisma/client";

// Provider priority: prefer Perplexity (real-time web) then OpenAI, Google, Anthropic
const PROVIDER_PRIORITY: ProviderId[] = ["PERPLEXITY", "OPENAI", "GOOGLE", "ANTHROPIC"];

const discoverSchema = z.object({
  name: z.string().min(1).max(120),
  domain: z.string().min(3).max(253),
  description: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  language: z.string().min(2).max(8).optional(),
  keywords: z.array(z.string().min(1).max(80)).max(200).default([]),
});

export type DiscoverSuggestions = {
  competitors: Array<{ name: string; domain: string }>;
  keywords: string[];
  provider: string | null;
};

type RawPayload = {
  competitors?: Array<{ name?: string; domain?: string }>;
  keywords?: unknown[];
};

function parsePayload(text: string): RawPayload {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  const start = trimmed.indexOf("{");
  const candidate = fenced ?? (start >= 0 ? trimmed.slice(start) : trimmed);
  try {
    return JSON.parse(candidate) as RawPayload;
  } catch {
    const s = trimmed.indexOf("{");
    const e = trimmed.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(trimmed.slice(s, e + 1)) as RawPayload;
      } catch {
        return {};
      }
    }
    return {};
  }
}

/**
 * AI-powered market discovery for the project creation wizard.
 * Returns competitor and keyword suggestions without persisting anything.
 * Falls back to empty arrays if no provider is configured.
 */
export const discoverProjectSuggestions = safeAction(
  discoverSchema,
  async (input) => {
    const available = providerRegistry.available();
    const provider = PROVIDER_PRIORITY.find((p) => available.includes(p)) ?? null;

    if (!provider) {
      return {
        competitors: [],
        keywords: [],
        provider: null,
      } satisfies DiscoverSuggestions;
    }

    const adapter = providerRegistry.get(provider);
    const webNote =
      provider === "PERPLEXITY"
        ? "Use current web knowledge. Cite only widely-recognized, real brands."
        : "Use your strongest market knowledge. Never invent unknown brands or domains.";

    const prompt = [
      "You are setting up competitive intelligence tracking for a real company.",
      webNote,
      "Return strict JSON only — no markdown, no extra text.",
      "",
      `Brand: ${input.name}`,
      `Domain: ${input.domain}`,
      `Description: ${input.description ?? "not provided"}`,
      `Target market: ${input.country ?? "global"} / ${input.language ?? "en"}`,
      `Known keywords: ${input.keywords.join(", ") || "none"}`,
      "",
      'Respond with this exact schema:',
      "{",
      '  "competitors": [{"name": "Brand Name", "domain": "brand.com"}],',
      '  "keywords": ["keyword phrase one", "keyword phrase two"]',
      "}",
      "",
      "Rules:",
      "- competitors: 4–8 real alternatives a buyer would evaluate instead of this brand.",
      "- keywords: 10–20 short search phrases (2–5 words) relevant to this brand's category.",
      "- Exclude the brand itself from both lists.",
      "- Domains must be real (no invented TLDs or subdomains).",
    ].join("\n");

    const response = await adapter.invoke({
      model: MODELS[provider].model,
      temperature: 0.1,
      maxTokens: 1800,
      prompt,
    });

    const raw = parsePayload(response.text);
    const projectDomain = input.domain.toLowerCase().replace(/^www\./, "");

    const competitors = (raw.competitors ?? [])
      .map((c) => ({
        name: (c.name ?? "").trim(),
        domain: (c.domain ?? "").trim().toLowerCase().replace(/^www\./, ""),
      }))
      .filter(
        (c) =>
          c.name.length > 0 &&
          c.name.toLowerCase() !== input.name.toLowerCase() &&
          c.domain !== projectDomain,
      )
      .slice(0, 10);

    const keywords = (raw.keywords ?? [])
      .map((k) => (typeof k === "string" ? k.trim() : ""))
      .filter((k) => k.length > 1 && k.length < 120)
      .filter((k) => !input.keywords.includes(k)) // dedupe against existing
      .slice(0, 30);

    return {
      competitors,
      keywords,
      provider: MODELS[provider].label,
    } satisfies DiscoverSuggestions;
  },
);
