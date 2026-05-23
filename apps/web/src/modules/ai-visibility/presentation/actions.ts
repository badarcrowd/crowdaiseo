"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { NotFound, Conflict } from "@/lib/errors";
import { audit } from "@/lib/audit/log";
import { scanRateLimit, actionRateLimit } from "@/lib/security/rate-limit";
import { bootstrapVisibilityProject } from "../application/bootstrap";
import {
  startVisibilityScan,
  cancelVisibilityScan,
  createPrompt,
  revisePrompt,
} from "..";
import {
  duplicatePrompt,
  setPromptStatus,
} from "../application/manage-prompts";
import {
  generatePromptsWithAI,
  saveGeneratedPrompts,
} from "../application/generate-prompts";

const providerEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"]);

const startScanSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  promptIds: z.array(z.string()).optional(),
  providers: z.array(providerEnum).optional(),
});

export const startVisibilityScanAction = safeAction(
  startScanSchema,
  async (input) => {
    await scanRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (!project || project.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }

    const { scanId, runs } = await startVisibilityScan({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      promptIds: input.promptIds,
      providers: input.providers,
      triggeredById: ctx.user.id,
    });

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `scan:${scanId}`,
      metadata: { projectId: input.projectId, runs },
    });

    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { scanId, runs };
  },
);

const cancelScanSchema = z.object({
  workspaceId: z.string().min(1),
  scanId: z.string().min(1),
});

export const cancelVisibilityScanAction = safeAction(
  cancelScanSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    await cancelVisibilityScan(input.scanId);
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { scanId: input.scanId };
  },
);

// ---- Prompt management ------------------------------------------------

const categoryEnum = z.enum([
  "COMMERCIAL",
  "INFORMATIONAL",
  "LOCAL_SEO",
  "BRAND",
  "COMPARISON",
  "TRANSACTIONAL",
]);

const createPromptSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  intent: z.string().max(64).optional(),
  category: categoryEnum.optional(),
  preferredProviders: z.array(providerEnum).optional(),
  content: z.string().min(8).max(8000),
  variables: z
    .array(z.object({ name: z.string().min(1), required: z.boolean().optional() }))
    .optional(),
});

export const createPromptAction = safeAction(
  createPromptSchema,
  async (input) => {
    await actionRateLimit();
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const prompt = await createPrompt({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      name: input.name,
      intent: input.intent,
      category: input.category,
      preferredProviders: input.preferredProviders,
      content: input.content,
      variables: input.variables,
      createdById: ctx.user.id,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { promptId: prompt.id };
  },
);

const revisePromptSchema = z.object({
  workspaceId: z.string().min(1),
  promptId: z.string().min(1),
  content: z.string().min(8).max(8000),
  notes: z.string().max(280).optional(),
});

export const revisePromptAction = safeAction(
  revisePromptSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const result = await revisePrompt({
      promptId: input.promptId,
      content: input.content,
      notes: input.notes,
      createdById: ctx.user.id,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return result;
  },
);

// ---- Bulk + duplicate + test -----------------------------------------

const bulkStatusSchema = z.object({
  workspaceId: z.string().min(1),
  promptIds: z.array(z.string().min(1)).min(1).max(500),
  status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]),
});

export const setPromptStatusAction = safeAction(
  bulkStatusSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    // Confine to prompts in this workspace — defense in depth.
    const owned = await prisma.prompt.findMany({
      where: { id: { in: input.promptIds }, workspaceId: input.workspaceId },
      select: { id: true },
    });
    const ownedIds = owned.map((p) => p.id);
    const { count } = await setPromptStatus(ownedIds, input.status);
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility/prompts`);
    return { count };
  },
);

const duplicateSchema = z.object({
  workspaceId: z.string().min(1),
  promptId: z.string().min(1),
});

export const duplicatePromptAction = safeAction(
  duplicateSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const source = await prisma.prompt.findUnique({
      where: { id: input.promptId },
      select: { workspaceId: true },
    });
    if (!source || source.workspaceId !== input.workspaceId) {
      throw NotFound("Prompt");
    }
    const result = await duplicatePrompt({
      promptId: input.promptId,
      createdById: ctx.user.id,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility/prompts`);
    return result;
  },
);

// Test prompt: kicks off a one-prompt scan (reuses the full scan flow).
const testPromptSchema = z.object({
  workspaceId: z.string().min(1),
  promptId: z.string().min(1),
  providers: z.array(providerEnum).min(1).max(4),
});

export const testPromptAction = safeAction(testPromptSchema, async (input) => {
  await scanRateLimit(input.workspaceId);
  const ctx = await requireRole(input.workspaceId, "EDITOR");
  const prompt = await prisma.prompt.findUnique({
    where: { id: input.promptId },
    select: { workspaceId: true, projectId: true },
  });
  if (!prompt || prompt.workspaceId !== input.workspaceId) {
    throw NotFound("Prompt");
  }
  const { scanId, runs } = await startVisibilityScan({
    workspaceId: input.workspaceId,
    projectId: prompt.projectId,
    promptIds: [input.promptId],
    providers: input.providers,
    triggeredById: ctx.user.id,
  });
  await audit({
    workspaceId: input.workspaceId,
    actorId: ctx.user.id,
    action: "project.updated",
    target: `scan:${scanId}`,
    metadata: { test: true, promptId: input.promptId, runs },
  });
  revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility/prompts`);
  return { scanId, runs };
});

// ---- Competitor management (from AI Visibility setup panel) -----------

const addCompetitorSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  domain: z.string().max(253).optional(),
});

export const addCompetitorAction = safeAction(
  addCompetitorSchema,
  async (input) => {
    await actionRateLimit();
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (project?.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    const existing = await prisma.competitor.findFirst({
      where: { projectId: input.projectId, name: input.name },
      select: { id: true },
    });
    if (existing) {
      throw Conflict(`Competitor "${input.name}" already exists`);
    }
    const competitor = await prisma.competitor.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        name: input.name,
        domain: input.domain ?? null,
      },
      select: { id: true, name: true, domain: true },
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `competitor:${competitor.id}`,
      metadata: { action: "add", name: input.name },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return competitor;
  },
);

const removeCompetitorSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  competitorId: z.string().min(1),
});

export const removeCompetitorAction = safeAction(
  removeCompetitorSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const competitor = await prisma.competitor.findUnique({
      where: { id: input.competitorId },
      select: { workspaceId: true, projectId: true, name: true },
    });
    if (
      competitor?.workspaceId !== input.workspaceId ||
      competitor?.projectId !== input.projectId
    ) {
      throw NotFound("Competitor");
    }
    await prisma.competitor.delete({ where: { id: input.competitorId } });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `competitor:${input.competitorId}`,
      metadata: { action: "remove", name: competitor.name },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return { competitorId: input.competitorId };
  },
);

const bootstrapPromptsSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
});

export const bootstrapPromptsAction = safeAction(
  bootstrapPromptsSchema,
  async (input) => {
    await actionRateLimit();
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (project?.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    const result = await bootstrapVisibilityProject(
      input.workspaceId,
      input.projectId,
    );
    const promptCount = await prisma.prompt.count({
      where: { projectId: input.projectId, status: "ACTIVE" },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility`);
    return {
      createdCompetitors: result.createdCompetitors,
      createdPrompts: result.createdPrompts,
      promptCount,
    };
  },
);

// ---- GEO prompt generation -------------------------------------------

const personaSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(120),
  intent: z.string().min(1).max(280),
});

const geoStrategyEnum = z.enum([
  "PERSONA",
  "COMPETITOR",
  "GEO",
  "BRAND",
  "TRANSACTIONAL",
]);

const generatePromptsSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  provider: providerEnum.nullable().optional(),
  strategies: z.array(geoStrategyEnum).min(1).max(5),
  personas: z.array(personaSchema).min(1).max(6),
});

/**
 * Generate GEO-quality prompts using the specified LLM.
 * Returns a preview list — call saveGeneratedPromptsAction to persist.
 */
export const generatePromptsAction = safeAction(
  generatePromptsSchema,
  async (input) => {
    await actionRateLimit();
    await requireRole(input.workspaceId, "EDITOR");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (project?.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    const result = await generatePromptsWithAI({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      provider: input.provider ?? null,
      strategies: input.strategies,
      personas: input.personas,
    });
    return {
      prompts: result.prompts,
      provider: result.provider,
    };
  },
);

const savePromptsSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  prompts: z.array(
    z.object({
      name: z.string().min(1).max(120),
      category: z.enum([
        "COMMERCIAL",
        "INFORMATIONAL",
        "COMPARISON",
        "BRAND",
        "TRANSACTIONAL",
        "LOCAL_SEO",
      ]),
      persona: z.string(),
      strategy: geoStrategyEnum,
      content: z.string().min(8).max(8000),
      rationale: z.string(),
    }),
  ).min(1).max(50),
});

/**
 * Persist a selection of AI-generated prompts.
 */
export const saveGeneratedPromptsAction = safeAction(
  savePromptsSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });
    if (project?.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    const count = await saveGeneratedPrompts({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      prompts: input.prompts,
      createdById: ctx.user.id,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `project:${input.projectId}`,
      metadata: { savedPrompts: count },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/ai-visibility/prompts`);
    return { saved: count };
  },
);
