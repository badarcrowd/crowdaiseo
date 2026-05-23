import { randomBytes } from "node:crypto";
import { Conflict, ValidationError } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";
import type { InviteMemberInput } from "../schemas";

const INVITE_TTL_DAYS = 7;

export const inviteMember = async (deps: {
  repo: WorkspaceRepository;
  invitedById: string;
  input: InviteMemberInput;
}) => {
  const existingInvite = await deps.repo.findInviteByEmail(
    deps.input.workspaceId,
    deps.input.email,
  );
  if (existingInvite) throw Conflict("An active invite already exists for this email");

  const members = await deps.repo.listMembers(deps.input.workspaceId);
  if (members.some((m) => m.user.email.toLowerCase() === deps.input.email)) {
    throw ValidationError(null, "User is already a member of this workspace");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  return deps.repo.createInvite({
    workspaceId: deps.input.workspaceId,
    email: deps.input.email,
    role: deps.input.role,
    token,
    invitedById: deps.invitedById,
    expiresAt,
  });
};
