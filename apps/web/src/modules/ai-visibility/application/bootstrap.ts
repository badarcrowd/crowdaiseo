import "server-only";
import type { Prisma, PromptCategory, ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { MODELS } from "../domain/providers";
import { providerRegistry } from "../infrastructure/providers/registry";

type BootstrapResult = {
  createdCompetitors: number;
  createdPrompts: number;
  discoveryProvider: ProviderId | null;
};

type ProjectContext = {
  id: string;
  workspaceId: string;
  name: string;
  domain: string;
  description: string | null;
  country: string | null;
  language: string | null;
  keywords: string[];
};

type DiscoveryCompetitor = {
  name: string;
  domain?: string | null;
  aliases?: string[];
};

type DiscoveryPersona = {
  name: string;
  role: string;
  intent: string;
};

type DiscoveryPayload = {
  competitors?: DiscoveryCompetitor[];
  personas?: DiscoveryPersona[];
  category_terms?: string[];
};

const MIN_COMPETITORS = 1;
const BOOTSTRAP_PROMPT_MARKER = "[AIV bootstrap]";

const DEFAULT_PERSONAS: DiscoveryPersona[] = [
  {
    name: "Evaluation buyer",
    role: "Commercial decision maker",
    intent: "Compare vendors and shortlist the best option",
  },
  {
    name: "Technical validator",
    role: "Technical evaluator",
    intent: "Validate capabilities, integrations, and implementation risk",
  },
  {
    name: "Problem researcher",
    role: "Category researcher",
    intent: "Understand solutions and alternatives before naming a vendor",
  },
];

const PROVIDER_PRIORITY: ProviderId[] = [
  "PERPLEXITY",
  "OPENAI",
  "GOOGLE",
  "ANTHROPIC",
];

export async function bootstrapVisibilityProject(
  workspaceId: string,
  projectId: string,
): Promise<BootstrapResult> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      domain: true,
      description: true,
      country: true,
      language: true,
      keywords: true,
    },
  });
  if (!project) {
    return { createdCompetitors: 0, createdPrompts: 0, discoveryProvider: null };
  }

  const [competitorCount, activePromptCount] = await Promise.all([
    prisma.competitor.count({ where: { projectId } }),
    prisma.prompt.count({ where: { projectId, status: "ACTIVE" } }),
  ]);

  if (competitorCount >= MIN_COMPETITORS && activePromptCount > 0) {
    return { createdCompetitors: 0, createdPrompts: 0, discoveryProvider: null };
  }

  const discovery =
    competitorCount < MIN_COMPETITORS
      ? await discoverMarket(project).catch((err) => {
          logger.warn(
            { projectId, err: err instanceof Error ? err.message : err },
            "visibility bootstrap discovery failed",
          );
          return null;
        })
      : null;

  const createdCompetitors =
    competitorCount < MIN_COMPETITORS
      ? await upsertDiscoveredCompetitors({
          project,
          competitors: discovery?.payload.competitors ?? [],
          existingCount: competitorCount,
      })
      : 0;

  const finalCompetitorCount =
    competitorCount + createdCompetitors >= MIN_COMPETITORS
      ? competitorCount + createdCompetitors
      : await prisma.competitor.count({ where: { projectId } });
  if (finalCompetitorCount < MIN_COMPETITORS) {
    logger.warn(
      {
        projectId,
        competitorsFound: finalCompetitorCount,
        discoveryProvider: discovery?.provider ?? null,
      },
      "visibility bootstrap: no competitors found — prompts will still be generated",
    );
  }

  const createdPrompts =
    activePromptCount === 0
      ? await createBootstrapPrompts({
          project,
          personas:
            normalizePersonas(discovery?.payload.personas).length > 0
              ? normalizePersonas(discovery?.payload.personas)
              : DEFAULT_PERSONAS,
          categoryTerms: normalizeTerms(discovery?.payload.category_terms),
        })
      : 0;

  return {
    createdCompetitors,
    createdPrompts,
    discoveryProvider: discovery?.provider ?? null,
  };
}

async function discoverMarket(project: ProjectContext): Promise<{
  provider: ProviderId;
  payload: DiscoveryPayload;
} | null> {
  const provider = pickDiscoveryProvider();
  if (!provider) return null;

  const adapter = providerRegistry.get(provider);
  const response = await adapter.invoke({
    model: MODELS[provider].model,
    temperature: 0.1,
    maxTokens: 1400,
    prompt: buildDiscoveryPrompt(project, provider),
  });

  const payload = parseJsonPayload(response.text);
  if (!payload) return { provider, payload: {} };
  return { provider, payload };
}

function pickDiscoveryProvider(): ProviderId | null {
  const available = new Set(providerRegistry.available());
  return PROVIDER_PRIORITY.find((provider) => available.has(provider)) ?? null;
}

function buildDiscoveryPrompt(project: ProjectContext, provider: ProviderId) {
  const webInstruction =
    provider === "PERPLEXITY"
      ? "Use current web knowledge and cite only widely recognized direct competitors."
      : "Use your strongest market knowledge and avoid inventing unknown brands.";

  return [
    "You are preparing an AI visibility tracking setup for a real company.",
    webInstruction,
    "Return strict JSON only. No markdown.",
    "",
    `Brand: ${project.name}`,
    `Domain: ${project.domain}`,
    `Description: ${project.description ?? "not provided"}`,
    `Country: ${project.country ?? "global"}`,
    `Language: ${project.language ?? "en"}`,
    `Keywords: ${project.keywords.join(", ") || "not provided"}`,
    "",
    "Schema:",
    "{",
    '  "competitors": [{"name": "Competitor", "domain": "example.com", "aliases": ["Alias"]}],',
    '  "personas": [{"name": "Persona name", "role": "Role", "intent": "Search intent"}],',
    '  "category_terms": ["category keyword"]',
    "}",
    "",
    "Rules:",
    "- Return at least 3 competitors.",
    "- Competitors must be alternatives a buyer would evaluate against this brand.",
    "- Personas must reflect real search/evaluation jobs for this category.",
    "- Keep category_terms short and useful for prompt generation.",
  ].join("\n");
}

function parseJsonPayload(text: string): DiscoveryPayload | null {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  const jsonStart = trimmed.indexOf("{");
  const candidate = fenced ?? (jsonStart >= 0 ? trimmed.slice(jsonStart) : trimmed);
  try {
    const parsed = JSON.parse(candidate) as DiscoveryPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as DiscoveryPayload;
    } catch {
      return null;
    }
  }
}

async function upsertDiscoveredCompetitors(input: {
  project: ProjectContext;
  competitors: DiscoveryCompetitor[];
  existingCount: number;
}) {
  const needed = Math.max(0, MIN_COMPETITORS - input.existingCount);
  if (needed === 0) return 0;

  const competitors = normalizeCompetitors(input.competitors, input.project)
    .slice(0, Math.max(MIN_COMPETITORS, needed));
  if (competitors.length === 0) return 0;

  const before = await prisma.competitor.count({
    where: { projectId: input.project.id },
  });
  await prisma.competitor.createMany({
    data: competitors.map((competitor) => ({
      workspaceId: input.project.workspaceId,
      projectId: input.project.id,
      name: competitor.name,
      domain: competitor.domain,
      aliases: competitor.aliases,
    })),
    skipDuplicates: true,
  });
  const after = await prisma.competitor.count({
    where: { projectId: input.project.id },
  });
  return Math.max(0, after - before);
}

function normalizeCompetitors(
  competitors: DiscoveryCompetitor[],
  project: ProjectContext,
) {
  const projectDomain = normalizeDomain(project.domain);
  const seen = new Set<string>();
  return competitors
    .map((competitor) => {
      const name = cleanName(competitor.name);
      const domain = normalizeDomain(competitor.domain ?? undefined);
      const aliases = (competitor.aliases ?? []).map(cleanName).filter(Boolean);
      return { name, domain, aliases };
    })
    .filter((competitor) => {
      if (!competitor.name) return false;
      if (competitor.domain && competitor.domain === projectDomain) return false;
      const key = competitor.name.toLowerCase();
      if (key === project.name.toLowerCase() || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function createBootstrapPrompts(input: {
  project: ProjectContext;
  personas: DiscoveryPersona[];
  categoryTerms: string[];
}) {
  const categories: Array<{
    name: string;
    category: PromptCategory;
    template: (persona: DiscoveryPersona, categoryTerm: string) => string;
  }> = [
    {
      name: "Vendor shortlist",
      category: "COMMERCIAL",
      template: (persona, categoryTerm) =>
        `As a ${persona.role}, shortlist the best ${categoryTerm} solutions for: ${persona.intent}. Compare {{brand}} against credible alternatives and explain why each is recommended.`,
    },
    {
      name: "Competitor comparison",
      category: "COMPARISON",
      template: (persona, categoryTerm) =>
        `As a ${persona.role}, compare {{brand}} with its main competitors for ${categoryTerm}. Rank the options, mention tradeoffs, and cite sources when available.`,
    },
    {
      name: "Problem-led research",
      category: "INFORMATIONAL",
      template: (persona, categoryTerm) =>
        `I am a ${persona.role} researching ${categoryTerm}. Which vendors, guides, and sources should I trust before choosing a platform? Include {{brand}} when relevant.`,
    },
    {
      name: "Purchase intent",
      category: "TRANSACTIONAL",
      template: (persona, categoryTerm) =>
        `As a ${persona.role} ready to evaluate ${categoryTerm}, what should I know before booking demos or starting trials? Compare {{brand}} with alternatives.`,
    },
  ];

  const categoryTerm = bestCategoryTerm(input.project, input.categoryTerms);
  const data: Prisma.PromptCreateInput[] = input.personas
    .slice(0, 4)
    .flatMap((persona) =>
      categories.map((category) => ({
        workspaceId: input.project.workspaceId,
        project: { connect: { id: input.project.id } },
        name: `${category.name} - ${persona.name}`,
        intent: persona.intent,
        category: category.category,
        preferredProviders: [],
        status: "ACTIVE",
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            content: `${BOOTSTRAP_PROMPT_MARKER}\n${category.template(
              persona,
              categoryTerm,
            )}`,
            variables: [
              { name: "brand", required: true },
              { name: "domain", required: false },
            ],
            notes: `Generated from persona: ${persona.name}`,
          },
        },
      })),
    );

  let created = 0;
  for (const prompt of data) {
    const exists = await prisma.prompt.findFirst({
      where: {
        projectId: input.project.id,
        name: prompt.name,
      },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.prompt.create({ data: prompt });
    created++;
  }
  return created;
}

function normalizePersonas(personas?: DiscoveryPersona[]) {
  const seen = new Set<string>();
  return (personas ?? [])
    .map((persona) => ({
      name: cleanName(persona.name),
      role: cleanName(persona.role),
      intent: cleanName(persona.intent),
    }))
    .filter((persona) => {
      if (!persona.name || !persona.role || !persona.intent) return false;
      const key = persona.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeTerms(terms?: string[]) {
  return (terms ?? []).map(cleanName).filter(Boolean).slice(0, 5);
}

function bestCategoryTerm(project: ProjectContext, terms: string[]) {
  return (
    project.keywords[0] ??
    terms[0] ??
    project.description?.split(/[.。]/)[0]?.slice(0, 80) ??
    `${project.name} alternatives`
  );
}

function normalizeDomain(domain?: string) {
  if (!domain) return null;
  try {
    const url = domain.startsWith("http") ? new URL(domain) : new URL(`https://${domain}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return (
      domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        ?.toLowerCase() ?? null
    );
  }
}

function cleanName(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}
