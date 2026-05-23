import { withErrorHandling, ok } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { apiRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma/client";
import { NotFound } from "@/lib/errors";
import { executiveInsightQueries } from "@/modules/executive-insights";

type RouteContext = { params: { workspaceId: string; projectId: string } };

/**
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/insights/alerts
 *
 * Returns CRITICAL strategic alerts and competitive threats from the
 * past 14 days. Used to power alert banners and notification feeds.
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteContext) => {
    await apiRateLimit();
    const ctx = await requireWorkspace(params.workspaceId, "VIEWER");

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { workspaceId: true },
    });
    if (!project || project.workspaceId !== ctx.workspaceId) {
      throw NotFound("Project");
    }

    const alerts = await executiveInsightQueries.listAlerts(
      params.workspaceId,
      params.projectId,
    );

    return ok(alerts);
  },
);
