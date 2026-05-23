import { Conflict } from "@/lib/errors";
import type { WorkspaceRepository } from "../domain/ports";
import type { CreateWorkspaceInput } from "../schemas";

/**
 * Use case: create a new workspace and seed the creator as OWNER.
 * Pure function over its dependencies — no module-level imports of
 * Prisma, Redis, Supabase, etc.
 */
export const createWorkspace = async (deps: {
  repo: WorkspaceRepository;
  userId: string;
  input: CreateWorkspaceInput;
}) => {
  const existing = await deps.repo.findBySlug(deps.input.slug);
  if (existing) throw Conflict(`Workspace slug "${deps.input.slug}" is taken`);

  const workspace = await deps.repo.create({
    slug: deps.input.slug,
    name: deps.input.name,
    ownerId: deps.userId,
  });

  await deps.repo.addMember({
    workspaceId: workspace.id,
    userId: deps.userId,
    role: "OWNER",
    joinedAt: new Date(),
  });

  return workspace;
};
