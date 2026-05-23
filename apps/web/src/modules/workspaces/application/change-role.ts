import type { WorkspaceRole } from "@prisma/client";
import { Forbidden, NotFound, ValidationError } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";

/**
 * Change a member's role. Guards:
 *  - Only OWNERs can promote/demote other OWNERs.
 *  - Cannot demote the last remaining OWNER.
 *  - Cannot use this to mint a new OWNER (use a dedicated transfer flow).
 */
export const changeMemberRole = async (deps: {
  repo: WorkspaceRepository;
  actorRole: WorkspaceRole;
  workspaceId: string;
  targetUserId: string;
  newRole: WorkspaceRole;
}) => {
  if (deps.newRole === "OWNER") {
    throw ValidationError(null, "Use the transfer-ownership flow to assign OWNER");
  }

  const target = await deps.repo.getMember(deps.workspaceId, deps.targetUserId);
  if (!target) throw NotFound("Member");

  if (target.role === "OWNER" && deps.actorRole !== "OWNER") {
    throw Forbidden("Only owners can change another owner's role");
  }

  if (target.role === "OWNER") {
    const owners = await deps.repo.countOwners(deps.workspaceId);
    if (owners <= 1) throw ValidationError(null, "Cannot demote the last owner");
  }

  await deps.repo.updateRole(deps.workspaceId, deps.targetUserId, deps.newRole);
};
