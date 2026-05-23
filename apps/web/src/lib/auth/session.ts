import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { WorkspaceRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { Forbidden, Unauthenticated } from "@/lib/errors";

/**
 * Per-request user resolver. Cached so multiple RSCs in the same render
 * share one Supabase round-trip.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = async () => {
  const user = await getCurrentUser();
  if (!user) throw Unauthenticated();
  return user;
};

/**
 * Use in protected pages: redirects to sign-in instead of throwing.
 */
export const requireUserOrRedirect = async (redirectTo = "/sign-in") => {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
};

const ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export const roleAtLeast = (role: WorkspaceRole, minimum: WorkspaceRole) =>
  ROLE_RANK[role] >= ROLE_RANK[minimum];

/**
 * Resolve the current user's membership in a workspace. Throws 403 if
 * the user is not a member or 401 if unauthenticated.
 */
export const requireMembership = cache(async (workspaceId: string) => {
  const user = await requireUser();
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    include: { workspace: true },
  });
  if (!member) throw Forbidden();
  return { user, member, workspace: member.workspace };
});

export const requireRole = async (
  workspaceId: string,
  minimum: WorkspaceRole,
) => {
  const ctx = await requireMembership(workspaceId);
  if (!roleAtLeast(ctx.member.role, minimum)) throw Forbidden();
  return ctx;
};

/**
 * Used by the app shell to pick a "current workspace" when the URL
 * doesn't already encode one. Falls back, in order, to:
 *   1. user.lastWorkspaceId (if still a member)
 *   2. the oldest workspace they belong to
 *   3. null — caller should redirect to /onboarding.
 */
export const resolveCurrentWorkspace = cache(async () => {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastWorkspaceId: true },
  });

  if (dbUser?.lastWorkspaceId) {
    const m = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: dbUser.lastWorkspaceId,
          userId: user.id,
        },
      },
      include: { workspace: true },
    });
    if (m) return { user, member: m, workspace: m.workspace };
  }

  const fallback = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!fallback) return null;
  return { user, member: fallback, workspace: fallback.workspace };
});
