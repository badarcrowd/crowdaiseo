import "server-only";
import type { PromptCategory, ProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { NotFound } from "@/lib/errors";

export type CreatePromptInput = {
  workspaceId: string;
  projectId: string;
  name: string;
  intent?: string;
  category?: PromptCategory;
  preferredProviders?: ProviderId[];
  content: string;
  variables?: Array<{ name: string; required?: boolean }>;
  createdById?: string | null;
};

/**
 * Create a new prompt with its initial version (v1).
 */
export const createPrompt = async (input: CreatePromptInput) => {
  return prisma.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        name: input.name,
        intent: input.intent,
        category: input.category ?? "INFORMATIONAL",
        preferredProviders: input.preferredProviders ?? [],
        createdById: input.createdById ?? undefined,
        currentVersion: 1,
      },
    });
    await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: 1,
        content: input.content,
        variables: input.variables ?? undefined,
        createdById: input.createdById ?? undefined,
      },
    });
    return prompt;
  });
};

/**
 * Add a new version to an existing prompt. Old runs keep pointing at
 * their captured version — they're never rewritten.
 */
export const revisePrompt = async (input: {
  promptId: string;
  content: string;
  variables?: Array<{ name: string; required?: boolean }>;
  notes?: string;
  createdById?: string | null;
}) => {
  return prisma.$transaction(async (tx) => {
    const prompt = await tx.prompt.findUnique({ where: { id: input.promptId } });
    if (!prompt) throw NotFound("Prompt");
    const nextVersion = prompt.currentVersion + 1;
    await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: nextVersion,
        content: input.content,
        variables: input.variables ?? undefined,
        notes: input.notes,
        createdById: input.createdById ?? undefined,
      },
    });
    await tx.prompt.update({
      where: { id: prompt.id },
      data: { currentVersion: nextVersion },
    });
    return { promptId: prompt.id, version: nextVersion };
  });
};

export const archivePrompt = async (promptId: string) => {
  await prisma.prompt.update({
    where: { id: promptId },
    data: { status: "ARCHIVED" },
  });
};

export const setPromptStatus = async (
  promptIds: string[],
  status: "ACTIVE" | "ARCHIVED" | "DRAFT",
) => {
  if (promptIds.length === 0) return { count: 0 };
  const res = await prisma.prompt.updateMany({
    where: { id: { in: promptIds } },
    data: { status },
  });
  return { count: res.count };
};

export const duplicatePrompt = async (input: {
  promptId: string;
  createdById?: string | null;
}) => {
  return prisma.$transaction(async (tx) => {
    const source = await tx.prompt.findUnique({
      where: { id: input.promptId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!source || source.versions.length === 0) throw NotFound("Prompt");
    const latest = source.versions[0];
    const copy = await tx.prompt.create({
      data: {
        workspaceId: source.workspaceId,
        projectId: source.projectId,
        name: `${source.name} (copy)`,
        intent: source.intent,
        category: source.category,
        preferredProviders: source.preferredProviders,
        status: "DRAFT",
        currentVersion: 1,
        createdById: input.createdById ?? undefined,
      },
    });
    await tx.promptVersion.create({
      data: {
        promptId: copy.id,
        version: 1,
        content: latest.content,
        variables: latest.variables ?? undefined,
        notes: `Duplicated from ${source.name} v${latest.version}`,
        createdById: input.createdById ?? undefined,
      },
    });
    return { promptId: copy.id };
  });
};
