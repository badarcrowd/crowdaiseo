import { withErrorHandling, ok } from "@/lib/api/response";
import { requireUser } from "@/lib/api/context";
import { prisma } from "@/lib/prisma/client";
import { apiRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/v1/workspaces — list workspaces the current user belongs to.
 */
export const GET = withErrorHandling(async () => {
  await apiRateLimit();
  const user = await requireUser();

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { joinedAt: "desc" },
  });

  return ok(
    memberships.map((m) => ({
      id: m.workspace.id,
      slug: m.workspace.slug,
      name: m.workspace.name,
      role: m.role,
    })),
  );
});
