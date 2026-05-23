import "server-only";
import { createClient } from "@/lib/supabase/server";
import { Unauthenticated, Forbidden } from "@/lib/errors";
import { prisma } from "@/lib/prisma/client";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Build the standard request context for an authenticated API route.
 *
 * Use `requireUser()` for routes scoped to the user (e.g. /me) and
 * `requireWorkspace()` for routes scoped to a workspace.
 */
export type AuthedUser = {
  id: string;
  email: string;
};

export const requireUser = async (): Promise<AuthedUser> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Unauthenticated();
  return { id: user.id, email: user.email! };
};

export type WorkspaceContext = {
  user: AuthedUser;
  workspaceId: string;
  role: WorkspaceRole;
};

export const requireWorkspace = async (
  workspaceId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership) throw Forbidden();
  if (!hasRole(membership.role, minRole)) throw Forbidden();
  return { user, workspaceId, role: membership.role };
};

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

const hasRole = (actual: WorkspaceRole, min: WorkspaceRole) =>
  ROLE_RANK[actual] >= ROLE_RANK[min];
