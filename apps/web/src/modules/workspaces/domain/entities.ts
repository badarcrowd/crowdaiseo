import type { PlanTier, WorkspaceRole } from "@prisma/client";

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  planTier: PlanTier;
  createdAt: Date;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type MemberWithUser = WorkspaceMember & {
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null };
};
