import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { apiRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma/client";
import { NotFound } from "@/lib/errors";
import { executiveInsightQueries } from "@/modules/executive-insights";
import type { InsightKind, InsightSeverity } from "@prisma/client";

type RouteContext = { params: { workspaceId: string; projectId: string } };

const querySchema = z.object({
  kinds: z.string().optional(),
  severity: z.enum(["CRITICAL", "ATTENTION", "INFO"]).optional(),
  since: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/insights
 *
 * Returns ranked executive insights for the given project.
 *
 * Query params:
 *   kinds   — comma-separated InsightKind values to filter by
 *   severity — CRITICAL | ATTENTION | INFO
 *   since   — ISO 8601 datetime lower bound on forDay
 *   limit   — 1–100 (default 50)
 */
export const GET = withErrorHandling(
  async (req: Request, { params }: RouteContext) => {
    await apiRateLimit();
    const ctx = await requireWorkspace(params.workspaceId, "VIEWER");

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { workspaceId: true },
    });
    if (!project || project.workspaceId !== ctx.workspaceId) {
      throw NotFound("Project");
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new Error("Invalid query parameters");
    }

    const { kinds, severity, since, limit } = parsed.data;

    const insights = await executiveInsightQueries.listInsights({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      kinds: kinds ? (kinds.split(",").map((k) => k.trim()) as InsightKind[]) : undefined,
      severity: severity as InsightSeverity | undefined,
      sinceDate: since ? new Date(since) : undefined,
      limit,
    });

    const stats = await executiveInsightQueries.getSummaryStats(
      params.workspaceId,
      params.projectId,
    );

    return ok({ insights, stats });
  },
);

/**
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/insights/alerts
 * is handled by the sub-route at /alerts/route.ts.
 *
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/insights/opportunities
 * is handled by the sub-route at /opportunities/route.ts.
 */
