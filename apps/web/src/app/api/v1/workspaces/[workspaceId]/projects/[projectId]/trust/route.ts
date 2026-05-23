import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { apiRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma/client";
import { NotFound } from "@/lib/errors";
import { buildProjectTrustBundle } from "@/modules/trust";

type RouteContext = { params: { workspaceId: string; projectId: string } };

const querySchema = z.object({
  scanId: z.string().optional(),
  windowDays: z.coerce.number().int().min(7).max(90).default(30),
});

/**
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/trust
 *
 * Returns the full trust bundle for a project:
 *   - confidence score (with breakdown)
 *   - freshness status (with warnings)
 *   - anomaly report
 *   - evidence trace
 *   - score change explanation
 *
 * Query params:
 *   scanId      — optional specific scan to trace evidence from
 *   windowDays  — history window (7–90, default 30)
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

    const { scanId, windowDays } = parsed.data;

    const bundle = await buildProjectTrustBundle({
      projectId: params.projectId,
      workspaceId: params.workspaceId,
      scanId,
      windowDays,
    });

    return ok(bundle);
  },
);
