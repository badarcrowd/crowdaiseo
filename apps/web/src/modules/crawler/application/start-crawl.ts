import { prisma } from "@/lib/prisma/client";
import { queues } from "@/lib/queue";
import type { CrawlStartPayload } from "@/lib/queue/types";
import { DEFAULT_USER_AGENT } from "../domain/entities";
import { normalizeUrl } from "../domain/url";
import { ValidationError } from "@/lib/errors";

export type StartCrawlInput = {
  workspaceId: string;
  projectId: string;
  rootUrl: string;
  createdById?: string | null;
  maxPages?: number;
  maxDepth?: number;
  respectRobots?: boolean;
  userAgent?: string;
};

/**
 * Public entry point: persist a Crawl row in QUEUED state and enqueue
 * the orchestrator job. Returns the new crawlId so callers (server
 * actions, scheduled jobs) can subscribe or poll.
 */
export const startCrawl = async (input: StartCrawlInput) => {
  const normalized = normalizeUrl(input.rootUrl);
  if (!normalized) {
    throw ValidationError(null, "rootUrl must be a valid http(s) URL");
  }

  const crawl = await prisma.crawl.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      rootUrl: normalized,
      maxPages: clampInt(input.maxPages, 1, 50_000, 500),
      maxDepth: clampInt(input.maxDepth, 0, 10, 5),
      respectRobots: input.respectRobots ?? true,
      userAgent: input.userAgent ?? DEFAULT_USER_AGENT,
      createdById: input.createdById ?? undefined,
    },
    select: { id: true, maxPages: true, maxDepth: true, respectRobots: true, userAgent: true },
  });

  await queues.crawlStart.add(
    "start",
    {
      crawlId: crawl.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      rootUrl: normalized,
      maxPages: crawl.maxPages,
      maxDepth: crawl.maxDepth,
      respectRobots: crawl.respectRobots,
      userAgent: crawl.userAgent ?? undefined,
    } satisfies CrawlStartPayload,
    { jobId: `start-${crawl.id}` }, // idempotent against double-fire
  );

  return { crawlId: crawl.id };
};

/**
 * Cancel a running crawl. Stops new pages from being processed (the
 * page handler checks status) and clears the frontier.
 */
export const cancelCrawl = async (crawlId: string) => {
  await prisma.crawl.update({
    where: { id: crawlId },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
};

const clampInt = (
  v: number | undefined,
  min: number,
  max: number,
  def: number,
) => {
  if (v === undefined || !Number.isFinite(v)) return def;
  return Math.min(max, Math.max(min, Math.floor(v)));
};
