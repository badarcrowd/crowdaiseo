import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";

/**
 * Canonical audit action vocabulary. Kept as a string union (not enum)
 * so consumers can introduce new actions without a migration — but the
 * type stops typos at the call site.
 */
export type AuditAction =
  | "workspace.created"
  | "workspace.updated"
  | "workspace.deleted"
  | "workspace.switched"
  | "member.role_changed"
  | "member.removed"
  | "member.left"
  | "invite.sent"
  | "invite.revoked"
  | "invite.accepted"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "api_key.created"
  | "api_key.revoked"
  | "auth.signed_in"
  | "auth.signed_out"
  | "report.created"
  | "report.schedule.created"
  | "report.share.revoked"
  | "report.white_label.updated"
  | "intelligence.scoring_config.updated"
  | "intelligence.insight.acknowledged"
  | "intelligence.pipeline.rerun"
  | "geo.pipeline.rerun"
  | "geo.recommendation.status_updated"
  | "executive.insight.pipeline.rerun"
  | "executive.insight.acknowledged";

export type AuditInput = {
  workspaceId: string;
  actorId: string | null;
  action: AuditAction;
  target?: string;
  metadata?: Record<string, unknown>;
};

const requestMeta = async () => {
  try {
    const h = await headers();
    return {
      ipAddress:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null,
      userAgent: h.get("user-agent") ?? null,
    };
  } catch {
    // Not in a request scope (e.g. worker)
    return { ipAddress: null, userAgent: null };
  }
};

/**
 * Write an audit event. Never throws — auditing failures should not
 * surface as user-visible errors.
 */
export const audit = async (input: AuditInput) => {
  try {
    const meta = await requestMeta();
    await prisma.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId ?? undefined,
        action: input.action,
        target: input.target,
        metadata: input.metadata as never,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write event", input.action, err);
  }
};
