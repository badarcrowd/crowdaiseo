import { Forbidden } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";

export const switchWorkspace = async (deps: {
  repo: WorkspaceRepository;
  userId: string;
  workspaceId: string;
}) => {
  const member = await deps.repo.getMember(deps.workspaceId, deps.userId);
  if (!member) throw Forbidden("Not a member of that workspace");
  await deps.repo.setLastWorkspace(deps.userId, deps.workspaceId);
  return member;
};
