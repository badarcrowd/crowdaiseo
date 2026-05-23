/**
 * Public barrel for the `workspaces` module.
 */
export { createWorkspace } from "./application/create-workspace";
export { inviteMember } from "./application/invite-member";
export { acceptInvite } from "./application/accept-invite";
export { changeMemberRole } from "./application/change-role";
export { removeMember } from "./application/remove-member";
export { switchWorkspace } from "./application/switch-workspace";

export { workspaceRepository } from "./infrastructure/workspace.repository";

export {
  createWorkspaceSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  revokeInviteSchema,
  changeRoleSchema,
  removeMemberSchema,
  switchWorkspaceSchema,
  workspaceRoleSchema,
  inviteRoleSchema,
  type CreateWorkspaceInput,
  type InviteMemberInput,
  type AcceptInviteInput,
  type ChangeRoleInput,
} from "./schemas";

export type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  MemberWithUser,
} from "./domain/entities";
