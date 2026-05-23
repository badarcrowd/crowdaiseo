import type { WorkspaceRole } from "@prisma/client";
import type {
  MemberWithUser,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
} from "./entities";

export interface WorkspaceRepository {
  findBySlug(slug: string): Promise<Workspace | null>;
  findById(id: string): Promise<Workspace | null>;
  listForUser(userId: string): Promise<Workspace[]>;
  create(input: { slug: string; name: string; ownerId: string }): Promise<Workspace>;

  // Members
  addMember(input: WorkspaceMember): Promise<void>;
  getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  listMembers(workspaceId: string): Promise<MemberWithUser[]>;
  updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  countOwners(workspaceId: string): Promise<number>;

  // Invites
  createInvite(input: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invitedById: string;
    expiresAt: Date;
  }): Promise<WorkspaceInvite>;
  findInviteByToken(token: string): Promise<WorkspaceInvite | null>;
  findInviteByEmail(workspaceId: string, email: string): Promise<WorkspaceInvite | null>;
  listInvites(workspaceId: string): Promise<WorkspaceInvite[]>;
  markInviteAccepted(id: string): Promise<void>;
  revokeInvite(id: string): Promise<void>;

  // User state
  setLastWorkspace(userId: string, workspaceId: string): Promise<void>;
}
