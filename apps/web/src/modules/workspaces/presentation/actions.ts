"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit/log";
import { safeAction } from "@/lib/actions/safe-action";
import {
  requireRole,
  requireUser,
  requireMembership,
} from "@/lib/auth/session";
import { syncUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/prisma/client";
import { clientEnv } from "@/config/env";
import {
  acceptInvite,
  changeMemberRole,
  createWorkspace,
  inviteMember,
  removeMember,
  switchWorkspace,
  workspaceRepository as repo,
} from "..";
import {
  acceptInviteSchema,
  changeRoleSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  removeMemberSchema,
  revokeInviteSchema,
  switchWorkspaceSchema,
} from "../schemas";

// ---- Create workspace -------------------------------------------------
export const createWorkspaceAction = safeAction(
  createWorkspaceSchema,
  async (input) => {
    const user = await requireUser();
    // Sync Supabase Auth user to Prisma DB (idempotent)
    await syncUser(user);
    const ws = await createWorkspace({ repo, userId: user.id, input });
    await repo.setLastWorkspace(user.id, ws.id);
    await audit({
      workspaceId: ws.id,
      actorId: user.id,
      action: "workspace.created",
      target: `workspace:${ws.id}`,
      metadata: { slug: ws.slug, name: ws.name },
    });
    revalidatePath("/app", "layout");
    return { id: ws.id, slug: ws.slug };
  },
);

// ---- Switch workspace -------------------------------------------------
export const switchWorkspaceAction = safeAction(
  switchWorkspaceSchema,
  async (input) => {
    const user = await requireUser();
    const member = await switchWorkspace({
      repo,
      userId: user.id,
      workspaceId: input.workspaceId,
    });
    await audit({
      workspaceId: member.workspaceId,
      actorId: user.id,
      action: "workspace.switched",
      target: `workspace:${member.workspaceId}`,
    });
    revalidatePath("/app", "layout");
    return { workspaceId: member.workspaceId };
  },
);

// ---- Invite member (ADMIN+) ------------------------------------------
export const inviteMemberAction = safeAction(
  inviteMemberSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const invite = await inviteMember({
      repo,
      invitedById: ctx.user.id,
      input,
    });

    const acceptUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

    // Email send is fire-and-forget; failure should not block the action.
    // The notifications module owns the actual transport.
    try {
      const { sendInviteEmail } = await import("@/modules/notifications");
      await sendInviteEmail({
        to: input.email,
        workspaceName: ctx.workspace.name,
        inviterEmail: ctx.user.email ?? "a teammate",
        acceptUrl,
      });
    } catch (err) {
      console.error("[invite] email send failed", err);
    }

    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "invite.sent",
      target: `invite:${invite.id}`,
      metadata: { email: input.email, role: input.role },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/settings/members`);
    return { id: invite.id, acceptUrl };
  },
);

// ---- Revoke invite (ADMIN+) ------------------------------------------
export const revokeInviteAction = safeAction(
  revokeInviteSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    await repo.revokeInvite(input.inviteId);
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "invite.revoked",
      target: `invite:${input.inviteId}`,
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/settings/members`);
    return { id: input.inviteId };
  },
);

// ---- Accept invite (any authenticated user) --------------------------
export const acceptInviteAction = safeAction(
  acceptInviteSchema,
  async (input) => {
    const user = await requireUser();
    // Sync user to Prisma DB (idempotent)
    await syncUser(user);
    const result = await acceptInvite({
      repo,
      token: input.token,
      userId: user.id,
      userEmail: user.email ?? "",
    });
    await repo.setLastWorkspace(user.id, result.workspaceId);
    await audit({
      workspaceId: result.workspaceId,
      actorId: user.id,
      action: "invite.accepted",
      metadata: { role: result.role },
    });
    revalidatePath("/app", "layout");
    return result;
  },
);

// ---- Change member role (ADMIN+) -------------------------------------
export const changeRoleAction = safeAction(
  changeRoleSchema,
  async (input) => {
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    await changeMemberRole({
      repo,
      actorRole: ctx.member.role,
      workspaceId: input.workspaceId,
      targetUserId: input.userId,
      newRole: input.role,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "member.role_changed",
      target: `user:${input.userId}`,
      metadata: { role: input.role },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/settings/members`);
    return { userId: input.userId, role: input.role };
  },
);

// ---- Remove member (ADMIN+ or self) ----------------------------------
export const removeMemberAction = safeAction(
  removeMemberSchema,
  async (input) => {
    const user = await requireUser();
    const isSelf = input.userId === user.id;
    const ctx = isSelf
      ? await requireMembership(input.workspaceId)
      : await requireRole(input.workspaceId, "ADMIN");

    await removeMember({
      repo,
      actorRole: ctx.member.role,
      actorUserId: user.id,
      workspaceId: input.workspaceId,
      targetUserId: input.userId,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: user.id,
      action: isSelf ? "member.left" : "member.removed",
      target: `user:${input.userId}`,
    });

    if (isSelf) {
      // Clear lastWorkspace if it matched
      await prisma.user.updateMany({
        where: { id: user.id, lastWorkspaceId: input.workspaceId },
        data: { lastWorkspaceId: null },
      });
      revalidatePath("/app", "layout");
      redirect("/app");
    }
    revalidatePath(`/app/w/${ctx.workspace.slug}/settings/members`);
    return { userId: input.userId };
  },
);
