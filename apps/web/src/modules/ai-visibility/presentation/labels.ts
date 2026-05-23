import type { PromptCategory, ProviderId } from "@prisma/client";

export const CATEGORY_META: Record<
  PromptCategory,
  { label: string; description: string; color: string }
> = {
  COMMERCIAL: {
    label: "Commercial",
    description: "Buying-intent queries",
    color: "hsl(var(--chart-2))",
  },
  INFORMATIONAL: {
    label: "Informational",
    description: "Research & how-to",
    color: "hsl(var(--chart-1))",
  },
  LOCAL_SEO: {
    label: "Local SEO",
    description: "Place-based queries",
    color: "hsl(var(--chart-3))",
  },
  BRAND: {
    label: "Brand",
    description: "Direct brand mentions",
    color: "hsl(var(--chart-4))",
  },
  COMPARISON: {
    label: "Comparison",
    description: "Vs. competitors",
    color: "hsl(var(--chart-5))",
  },
  TRANSACTIONAL: {
    label: "Transactional",
    description: "Pricing, demos, signups",
    color: "hsl(var(--success))",
  },
};

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  OPENAI: "ChatGPT",
  ANTHROPIC: "Claude",
  GOOGLE: "Gemini",
  PERPLEXITY: "Perplexity",
};

export const CATEGORY_ORDER: PromptCategory[] = [
  "COMMERCIAL",
  "INFORMATIONAL",
  "COMPARISON",
  "BRAND",
  "TRANSACTIONAL",
  "LOCAL_SEO",
];
