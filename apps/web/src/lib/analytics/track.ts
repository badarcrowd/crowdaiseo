import "server-only";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { getPostHogServer } from "./posthog-server";
import type { TrackEventInput } from "./events";

// Server-side event tracking: writes to PostHog (if configured) and to the
// local AnalyticsEvent table for retention/cohort queries.
export async function trackServer(input: TrackEventInput): Promise<void> {
  const { event, workspaceId, userId, properties = {} } = input;

  // Fire-and-forget to PostHog
  try {
    const ph = getPostHogServer();
    if (ph) {
      const distinctId = userId ?? workspaceId ?? "anonymous";
      ph.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          workspaceId,
          $groups: workspaceId ? { workspace: workspaceId } : undefined,
        },
      });
    }
  } catch (err) {
    logger.warn({ err, event }, "posthog capture failed (non-fatal)");
  }

  // Persist to local analytics table (best-effort, non-blocking)
  prisma.analyticsEvent
    .create({
      data: {
        workspaceId: workspaceId ?? null,
        userId: userId ?? null,
        event,
        properties: properties as never,
      },
    })
    .catch((err) => {
      logger.warn({ err, event }, "analytics event persist failed (non-fatal)");
    });
}

// Identify a workspace group in PostHog
export async function identifyWorkspace(
  workspaceId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const ph = getPostHogServer();
    ph?.groupIdentify({
      groupType: "workspace",
      groupKey: workspaceId,
      properties,
    });
  } catch (err) {
    logger.warn({ err }, "posthog group identify failed (non-fatal)");
  }
}
