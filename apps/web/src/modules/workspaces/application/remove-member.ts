import type { WorkspaceRole } from "@prisma/client";
import { Forbidden, NotFound, ValidationError } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";

export const removeMember = async (deps: {
  repo: WorkspaceRepository;
  actorRole: WorkspaceRole;
  actorUserId: string;
  workspaceId: string;
  targetUserId: string;
}) => {
  const target = await deps.repo.getMember(deps.workspaceId, deps.targetUserId);
  if (!target) throw NotFound("Member");

  const isSelf = deps.actorUserId === deps.targetUserId;

  if (target.role === "OWNER") {
    const owners = await deps.repo.countOwners(deps.workspaceId);
    if (owners <= 1) throw ValidationError(null, "Cannot remove the last owner");
    if (!isSelf && deps.actorRole !== "OWNER") {
      throw Forbidden("Only owners can remove another owner");
    }
  }

  await deps.repo.removeMember(deps.workspaceId, deps.targetUserId);
};
