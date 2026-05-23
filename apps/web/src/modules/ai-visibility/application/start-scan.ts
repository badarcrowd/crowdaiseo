import "server-only";
import { prisma } from "@/lib/prisma/client";
import { getQueues } from "@/lib/queue";
import type { AiVisibilityScanPayload } from "@/lib/queue/types";
import { ValidationError, ServiceUnavailable } from "@/lib/errors";
import type { ProviderId } from "@prisma/client";
import { ALL_PROVIDERS } from "../domain/providers";
import { bootstrapVisibilityProject } from "./bootstrap";

export type StartScanInput = {
  workspaceId: string;
  projectId: string;
  promptIds?: string[];      // omit to use all ACTIVE prompts for project
  providers?: ProviderId[];  // omit to use all configured providers
  triggeredById?: string | null;
};

/**
 * Public entry: persist a VisibilityScan row in QUEUED state and
 * enqueue the orchestrator job. Returns the new scanId so callers can
 * poll or subscribe.
 */
export const startVisibilityScan = async (input: StartScanInput) => {
  await bootstrapVisibilityProject(input.workspaceId, input.projectId);

  let promptIds = input.promptIds;
  if (!promptIds || promptIds.length === 0) {
    const prompts = await prisma.prompt.findMany({
      where: { projectId: input.projectId, status: "ACTIVE" },
      select: { id: true },
    });
    promptIds = prompts.map((p) => p.id);
  }
  if (promptIds.length === 0) {
    throw ValidationError(null, "No active prompts for this project");
  }

  const providers = input.providers && input.providers.length > 0
    ? input.providers
    : ALL_PROVIDERS;

  const scan = await prisma.visibilityScan.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      promptIds,
      providers,
      triggeredById: input.triggeredById ?? undefined,
      totalRuns: promptIds.length * providers.length,
    },
    select: { id: true },
  });

  const queues = getQueues();
  if (!queues) {
    // Clean up the created scan record since we can't process it
    await prisma.visibilityScan.delete({ where: { id: scan.id } });
    throw ServiceUnavailable("Background job processing is not configured. Please set REDIS_URL.");
  }

  await queues.aiVisibilityScan.add(
    "start",
    {
      scanId: scan.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      promptIds,
      providers,
      triggeredBy: input.triggeredById ?? undefined,
    } satisfies AiVisibilityScanPayload,
    { jobId: `aiv-start-${scan.id}` },
  );

  return { scanId: scan.id, runs: promptIds.length * providers.length };
};

export const cancelVisibilityScan = async (scanId: string) => {
  await prisma.visibilityScan.update({
    where: { id: scanId },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
};
