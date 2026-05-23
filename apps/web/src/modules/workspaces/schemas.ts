import { z } from "zod";
import { slugSchema } from "@/lib/validation";

export const workspaceRoleSchema = z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]);
export type WorkspaceRoleInput = z.infer<typeof workspaceRoleSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(64),
  slug: slugSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// Owners are minted by transfer, never directly via invite.
export const inviteRoleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

export const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email().toLowerCase(),
  role: inviteRoleSchema.default("EDITOR"),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const revokeInviteSchema = z.object({
  workspaceId: z.string().min(1),
  inviteId: z.string().min(1),
});

export const changeRoleSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().uuid(),
  role: inviteRoleSchema,
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const removeMemberSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().uuid(),
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});
