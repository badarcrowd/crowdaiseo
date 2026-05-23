import { Forbidden, NotFound, ValidationError } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";

export const acceptInvite = async (deps: {
  repo: WorkspaceRepository;
  token: string;
  userId: string;
  userEmail: string;
}) => {
  const invite = await deps.repo.findInviteByToken(deps.token);
  if (!invite) throw NotFound("Invite");
  if (invite.acceptedAt) throw ValidationError(null, "Invite has already been accepted");
  if (invite.revokedAt) throw ValidationError(null, "Invite has been revoked");
  if (invite.expiresAt < new Date()) throw ValidationError(null, "Invite has expired");
  if (invite.email.toLowerCase() !== deps.userEmail.toLowerCase()) {
    throw Forbidden("This invite was sent to a different email address");
  }

  await deps.repo.addMember({
    workspaceId: invite.workspaceId,
    userId: deps.userId,
    role: invite.role,
    joinedAt: new Date(),
  });
  await deps.repo.markInviteAccepted(invite.id);

  return { workspaceId: invite.workspaceId, role: invite.role };
};
