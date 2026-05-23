"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { NotFound } from "@/lib/errors";
import { audit } from "@/lib/audit/log";
import { startCrawl, cancelCrawl } from "..";

const startCrawlSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  rootUrl: z.string().url().optional(),
  maxPages: z.number().int().positive().max(50_000).optional(),
  maxDepth: z.number().int().min(0).max(10).optional(),
  respectRobots: z.boolean().optional(),
});

export const startCrawlAction = safeAction(
  startCrawlSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true, domain: true },
    });
    if (!project || project.workspaceId !== input.workspaceId) {
      throw NotFound("Project");
    }

    const rootUrl = input.rootUrl ?? `https://${project.domain}`;

    const { crawlId } = await startCrawl({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      rootUrl,
      maxPages: input.maxPages,
      maxDepth: input.maxDepth,
      respectRobots: input.respectRobots,
      createdById: ctx.user.id,
    });

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "project.updated",
      target: `crawl:${crawlId}`,
      metadata: { projectId: input.projectId, rootUrl },
    });

    revalidatePath(`/app/w/${ctx.workspace.slug}/projects`);
    return { crawlId };
  },
);

const cancelCrawlSchema = z.object({
  workspaceId: z.string().min(1),
  crawlId: z.string().min(1),
});

export const cancelCrawlAction = safeAction(
  cancelCrawlSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    await cancelCrawl(input.crawlId);
    revalidatePath(`/app/w/${ctx.workspace.slug}/projects`);
    return { crawlId: input.crawlId };
  },
);
