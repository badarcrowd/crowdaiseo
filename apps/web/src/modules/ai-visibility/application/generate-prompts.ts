import "server-only";
import type { Prisma, PromptCategory, ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { MODELS } from "../domain/providers";
import { providerRegistry } from "../infrastructure/providers/registry";

// ─── Public types ──────────────────────────────────────────────────────────

export type GeoStrategy =
  | "PERSONA"       // persona × buyer-journey cross product
  | "COMPETITOR"    // brand-vs-competitor comparison queries
  | "GEO"          // geo/language targeted queries
  | "BRAND"        // brand SERP protection queries
  | "TRANSACTIONAL"; // pricing / demo / trial queries

export type Persona = {
  name: string;
  role: string;
  intent: string;
};

export type GeneratedPrompt = {
  name: string;
  category: PromptCategory;
  persona: string;
  strategy: GeoStrategy;
  content: string;
  rationale: string;
};

export type GeneratePromptsInput = {
  workspaceId: string;
  projectId: string;
  provider?: ProviderId | null;
  strategies: GeoStrategy[];
  personas: Persona[];
};

export type GeneratePromptsResult = {
  prompts: GeneratedPrompt[];
  provider: ProviderId;
};

// ─── Provider priority ────────────────────────────────────────────────────

const PROVIDER_PRIORITY: ProviderId[] = [
  "PERPLEXITY",
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
];

function pickProvider(preferred?: ProviderId | null): ProviderId | null {
  const available = new Set(providerRegistry.available());
  if (preferred && available.has(preferred)) return preferred;
  return PROVIDER_PRIORITY.find((p) => available.has(p)) ?? null;
}

// ─── Generation entry point ───────────────────────────────────────────────

export async function generatePromptsWithAI(
  input: GeneratePromptsInput,
): Promise<GeneratePromptsResult> {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, workspaceId: input.workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      domain: true,
      description: true,
      country: true,
      language: true,
      keywords: true,
    },
  });
  if (!project) throw new Error("Project not found");

  const competitors = await prisma.competitor.findMany({
    where: { projectId: input.projectId },
    select: { name: true, domain: true },
    take: 8,
  });

  const provider = pickProvider(input.provider);
  if (!provider) throw new Error("No AI provider configured");

  const adapter = providerRegistry.get(provider);
  const systemPrompt = buildGenerationPrompt(
    project,
    competitors,
    input.personas,
    input.strategies,
  );

  logger.info(
    { projectId: input.projectId, provider, strategies: input.strategies },
    "generate-prompts: calling LLM",
  );

  const response = await adapter.invoke({
    model: MODELS[provider].model,
    temperature: 0.4,
    maxTokens: 3000,
    prompt: systemPrompt,
  });

  const prompts = parseGeneratedPrompts(response.text);
  logger.info(
    { projectId: input.projectId, provider, count: prompts.length },
    "generate-prompts: parsed",
  );

  return { prompts, provider };
}

// ─── Save generated prompts ───────────────────────────────────────────────

export async function saveGeneratedPrompts(input: {
  workspaceId: string;
  projectId: string;
  prompts: GeneratedPrompt[];
  createdById?: string;
}): Promise<number> {
  const data: Prisma.PromptCreateInput[] = input.prompts.map((p) => ({
    workspaceId: input.workspaceId,
    project: { connect: { id: input.projectId } },
    name: p.name,
    intent: p.rationale.slice(0, 64),
    category: p.category,
    preferredProviders: [],
    status: "ACTIVE",
    currentVersion: 1,
    ...(input.createdById ? { createdById: input.createdById } : {}),
    versions: {
      create: {
        version: 1,
        content: p.content,
        notes: `GEO-generated | Strategy: ${p.strategy} | Persona: ${p.persona}`,
        ...(input.createdById ? { createdById: input.createdById } : {}),
      },
    },
  }));

  let created = 0;
  for (const prompt of data) {
    const exists = await prisma.prompt.findFirst({
      where: { projectId: input.projectId, name: prompt.name as string },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.prompt.create({ data: prompt });
    created++;
  }
  return created;
}

// ─── Prompt builder ───────────────────────────────────────────────────────

function buildGenerationPrompt(
  project: {
    name: string;
    domain: string;
    description: string | null;
    country: string | null;
    language: string | null;
    keywords: string[];
  },
  competitors: { name: string; domain: string | null }[],
  personas: Persona[],
  strategies: GeoStrategy[],
) {
  const competitorList =
    competitors.length > 0
      ? competitors.map((c) => c.name).join(", ")
      : "no direct competitors identified yet";

  const personaList = personas
    .map((p) => `- ${p.name} (${p.role}): "${p.intent}"`)
    .join("\n");

  const strategyInstructions: Record<GeoStrategy, string> = {
    PERSONA: `
PERSONA queries — Cross each persona with awareness/consideration/decision phases:
  • Awareness: "What is [category]?", "Best [category] for [persona role]"
  • Consideration: "Which [category] platform is best for [persona role]?"
  • Decision: "Should I use ${project.name} for [persona use case]?"
  Category must be: INFORMATIONAL or COMMERCIAL.`,

    COMPETITOR: `
COMPETITOR queries — Brand-vs-competitor comparisons that surface ${project.name}:
  • "Is ${project.name} better than [competitor]?"
  • "[competitor] vs ${project.name} comparison"
  • "Alternatives to [competitor] for [use case]"
  • "Why choose ${project.name} over [competitor]?"
  Category must be: COMPARISON.`,

    GEO: `
GEO-targeted queries — Locale and language-scoped queries${project.country ? ` for ${project.country}` : ""}:
  • "${project.name} for [country] businesses"
  • "Best [category] in [region/market]"
  • "[category] tools that support [language/market]"
  Category must be: LOCAL_SEO.`,

    BRAND: `
BRAND SERP queries — Protect and grow direct brand discovery:
  • "${project.name} reviews"
  • "Is ${project.name} reliable/good/trustworthy?"
  • "${project.name} features and pricing"
  • "What is ${project.name}?"
  Category must be: BRAND.`,

    TRANSACTIONAL: `
TRANSACTIONAL queries — Late-stage purchase intent:
  • "${project.name} pricing plans"
  • "${project.name} free trial / demo"
  • "How to get started with ${project.name}"
  • "${project.name} vs free alternatives"
  Category must be: TRANSACTIONAL.`,
  };

  const activeInstructions = strategies
    .map((s) => strategyInstructions[s])
    .join("\n");

  return [
    "You are a world-class GEO (Generative Engine Optimization) specialist.",
    "Your task: generate realistic AI visibility queries so LLM assistants",
    "(ChatGPT, Gemini, Claude, Perplexity) will discover and recommend this brand.",
    "",
    `Brand: ${project.name}`,
    `Domain: ${project.domain}`,
    `Description: ${project.description ?? "not provided"}`,
    `Country: ${project.country ?? "global"}`,
    `Language: ${project.language ?? "en"}`,
    `Keywords: ${project.keywords.join(", ") || "not provided"}`,
    `Competitors: ${competitorList}`,
    "",
    "TARGET PERSONAS:",
    personaList,
    "",
    "STRATEGIES TO COVER:",
    activeInstructions,
    "",
    "CRITICAL RULES:",
    "- Write every query as a real human would type it to an AI assistant.",
    "- Each query must create a natural opening for the brand to be mentioned.",
    "- Vary phrasing — no two queries should be near-identical.",
    "- Avoid marketing language; use authentic user vocabulary.",
    "- Generate 3–5 prompts per strategy (not per persona — use the most relevant persona).",
    "- category must be exactly one of: COMMERCIAL, INFORMATIONAL, COMPARISON, BRAND, TRANSACTIONAL, LOCAL_SEO",
    "",
    "Return ONLY valid JSON, no markdown fences, no explanation:",
    "{",
    '  "prompts": [',
    "    {",
    '      "name": "Short label (max 60 chars)",',
    '      "category": "COMMERCIAL|INFORMATIONAL|COMPARISON|BRAND|TRANSACTIONAL|LOCAL_SEO",',
    '      "persona": "Persona name from the list above",',
    '      "strategy": "PERSONA|COMPETITOR|GEO|BRAND|TRANSACTIONAL",',
    '      "content": "The full query text as a human types it to an AI assistant",',
    '      "rationale": "One sentence: why this query wins AI visibility for the brand"',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

// ─── Response parser ──────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<PromptCategory>([
  "COMMERCIAL",
  "INFORMATIONAL",
  "COMPARISON",
  "BRAND",
  "TRANSACTIONAL",
  "LOCAL_SEO",
]);

const VALID_STRATEGIES = new Set<GeoStrategy>([
  "PERSONA",
  "COMPETITOR",
  "GEO",
  "BRAND",
  "TRANSACTIONAL",
]);

function parseGeneratedPrompts(text: string): GeneratedPrompt[] {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  const start = trimmed.indexOf("{");
  const candidate = fenced ?? (start >= 0 ? trimmed.slice(start) : trimmed);

  let raw: unknown;
  try {
    raw = JSON.parse(candidate);
  } catch {
    const s = trimmed.indexOf("{");
    const e = trimmed.lastIndexOf("}");
    if (s < 0 || e <= s) return [];
    try {
      raw = JSON.parse(trimmed.slice(s, e + 1));
    } catch {
      return [];
    }
  }

  const list = (raw as { prompts?: unknown[] }).prompts;
  if (!Array.isArray(list)) return [];

  return list
    .filter(
      (item): item is Record<string, string> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      name: String(item.name ?? "").slice(0, 120).trim(),
      category: VALID_CATEGORIES.has(item.category as PromptCategory)
        ? (item.category as PromptCategory)
        : "INFORMATIONAL",
      persona: String(item.persona ?? "").slice(0, 80).trim(),
      strategy: VALID_STRATEGIES.has(item.strategy as GeoStrategy)
        ? (item.strategy as GeoStrategy)
        : "PERSONA",
      content: String(item.content ?? "").slice(0, 4000).trim(),
      rationale: String(item.rationale ?? "").slice(0, 200).trim(),
    }))
    .filter((p) => p.name.length > 0 && p.content.length > 8);
}
