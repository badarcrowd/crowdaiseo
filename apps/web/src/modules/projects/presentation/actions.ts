"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { Conflict, NotFound } from "@/lib/errors";
import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from "../schemas";

const ensureNotDuplicate = async (
  workspaceId: string,
  domain: string,
  ignoreProjectId?: string,
) => {
  const existing = await prisma.project.findFirst({
    where: {
      workspaceId,
      domain,
      deletedAt: null,
      ...(ignoreProjectId ? { NOT: { id: ignoreProjectId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw Conflict(`Project for "${domain}" already exists in this workspace`);
  }
};

export const createProjectAction = safeAction(
  createProjectSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    await ensureNotDuplicate(input.workspaceId, input.domain);

    let project: { id: string; name: string; domain: string };
    try {
      project = await prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            workspaceId: input.workspaceId,
            name: input.name,
            domain: input.domain,
            description: input.description,
            country: input.country,
            language: input.language,
            keywords: input.keywords,
          },
          select: { id: true, name: true, domain: true },
        });
        if (input.competitors.length > 0) {
          // Deduplicate competitors by name (case-insensitive) before insert
          const seen = new Set<string>();
          const uniqueCompetitors = input.competitors.filter((c) => {
            const key = c.name.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          await tx.competitor.createMany({
            data: uniqueCompetitors.map((c) => ({
              workspaceId: input.workspaceId,
              projectId: created.id,
              name: c.name.trim(),
              domain: c.domain ?? null,
            })),
            skipDuplicates: true,
          });
        }
        return created;
      });
    } catch (err) {
      // Convert Prisma unique constraint violations to user-friendly errors
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        throw Conflict(
          `A project with domain "${input.domain}" already exists in this workspace`,
        );
      }
      throw err;
    }

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.created",
      target: `project:${project.id}`,
      metadata: {
        name: project.name,
        domain: project.domain,
        keywords: input.keywords.length,
        competitors: input.competitors.length,
      },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/projects`);
    return { projectId: project.id };
  },
);

export const updateProjectAction = safeAction(
  updateProjectSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true, domain: true },
    });
    if (!project || project.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    if (input.domain && input.domain !== project.domain) {
      await ensureNotDuplicate(input.workspaceId, input.domain, input.projectId);
    }
    await prisma.project.update({
      where: { id: input.projectId },
      data: {
        name: input.name,
        domain: input.domain,
        description: input.description,
        country: input.country,
        language: input.language,
        keywords: input.keywords,
      },
    });
    if (input.competitors) {
      await prisma.$transaction([
        prisma.competitor.deleteMany({ where: { projectId: input.projectId } }),
        prisma.competitor.createMany({
          data: input.competitors.map((c) => ({
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            name: c.name,
            domain: c.domain,
          })),
          skipDuplicates: true,
        }),
      ]);
    }
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `project:${input.projectId}`,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/projects`);
    return { projectId: input.projectId };
  },
);

export const deleteProjectAction = safeAction(
  deleteProjectSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true, name: true, domain: true },
    });
    if (!project || project.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }
    await prisma.$transaction(async (tx) => {
      // PromptRun.promptId has onDelete: Restrict, so it must be cleared before
      // the project cascade reaches Prompt records.
      await tx.promptRun.deleteMany({
        where: { scan: { projectId: input.projectId } },
      });
      // Hard delete — cascades to Competitor, Prompt, VisibilityScan, etc.
      await tx.project.delete({ where: { id: input.projectId } });
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.deleted",
      target: `project:${input.projectId}`,
      metadata: { name: project.name, domain: project.domain },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/projects`);
    return { projectId: input.projectId };
  },
);
