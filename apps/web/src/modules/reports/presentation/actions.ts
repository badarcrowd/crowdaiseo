"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction } from "@/lib/actions/safe-action";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { actionRateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit/log";
import { queues } from "@/lib/queue";
import { reportRepository } from "../infrastructure/report.repository";
import { nextRunFromCron } from "../application/scheduler";

const templateEnum = z.enum([
  "EXECUTIVE_SUMMARY",
  "COMPETITOR_ANALYSIS",
  "GEO_OPTIMIZATION",
  "AI_VISIBILITY_DEEP_DIVE",
  "CITATION_AUTHORITY",
]);

// ---------------------------------------------------------------------
// Create + enqueue a one-off report.
// ---------------------------------------------------------------------

const createReportSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  template: templateEnum,
  title: z.string().min(1).max(200),
  parameters: z
    .object({
      rangeStart: z.string().optional(),
      rangeEnd: z.string().optional(),
      includeAiSummary: z.boolean().optional(),
    })
    .partial()
    .default({}),
  emailRecipients: z.array(z.string().email()).optional(),
  createShare: z.boolean().optional(),
});

export const createReportAction = safeAction(
  createReportSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    if (input.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });
      if (!project || project.workspaceId !== input.workspaceId) {
        return { ok: false as const, error: "not-found" as const };
      }
    }

    const report = await reportRepository.createReport({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      template: input.template,
      title: input.title,
      parameters: input.parameters,
      triggeredById: ctx.user.id,
    });
    await queues.reportGenerate.add(
      "generate",
      {
        reportId: report.id,
        workspaceId: input.workspaceId,
        emailRecipients: input.emailRecipients,
        createShare: input.createShare,
      },
      { jobId: `rpt-${report.id}` },
    );
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "report.created",
      target: `report:${report.id}`,
      metadata: { template: input.template },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/reports`);
    return { ok: true as const, reportId: report.id };
  },
);

// ---------------------------------------------------------------------
// Create a recurring schedule.
// ---------------------------------------------------------------------

const createScheduleSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  template: templateEnum,
  title: z.string().min(1).max(200),
  parameters: z.record(z.string(), z.unknown()).default({}),
  cron: z.string().min(3).max(80),
  timezone: z.string().default("UTC"),
  recipients: z.array(z.string().email()).default([]),
});

export const createReportScheduleAction = safeAction(
  createScheduleSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const nextRunAt = nextRunFromCron(input.cron, new Date());
    const schedule = await reportRepository.createSchedule({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      template: input.template,
      title: input.title,
      parameters: input.parameters,
      cron: input.cron,
      timezone: input.timezone,
      recipients: input.recipients,
      createdById: ctx.user.id,
      nextRunAt,
    });
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "report.schedule.created",
      target: `schedule:${schedule.id}`,
      metadata: { cron: input.cron, template: input.template },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/reports`);
    return { ok: true as const, scheduleId: schedule.id, nextRunAt };
  },
);

// ---------------------------------------------------------------------
// Manage shares
// ---------------------------------------------------------------------

const revokeShareSchema = z.object({
  workspaceId: z.string().min(1),
  shareId: z.string().min(1),
});

export const revokeReportShareAction = safeAction(
  revokeShareSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const share = await prisma.reportShare.findUnique({
      where: { id: input.shareId },
      select: { workspaceId: true, reportId: true },
    });
    if (!share || share.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }
    await reportRepository.revokeShare(input.shareId);
    await audit({
      workspaceId: input.workspaceId,
      actorId: ctx.user.id,
      action: "report.share.revoked",
      target: `share:${input.shareId}`,
      metadata: { reportId: share.reportId },
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/reports`);
    return { ok: true as const };
  },
);

// ---------------------------------------------------------------------
// White label config
// ---------------------------------------------------------------------

const whiteLabelSchema = z.object({
  workspaceId: z.string().min(1),
  brandName: z.string().min(1).max(120),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  footerText: z.string().max(500).nullable().optional(),
  shareDomain: z.string().max(120).nullable().optional(),
});

export const updateWhiteLabelAction = safeAction(
  whiteLabelSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "ADMIN");
    const { workspaceId, ...data } = input;
    await reportRepository.upsertWhiteLabel(workspaceId, data);
    await audit({
      workspaceId,
      actorId: ctx.user.id,
      action: "report.white_label.updated",
    });
    revalidatePath(`/app/w/${ctx.workspace.slug}/settings`);
    return { ok: true as const };
  },
);

// ---------------------------------------------------------------------
// Retry a failed report — reset to QUEUED and re-enqueue.
// ---------------------------------------------------------------------

const retryReportSchema = z.object({
  workspaceId: z.string().min(1),
  reportId: z.string().min(1),
});

export const retryReportAction = safeAction(
  retryReportSchema,
  async (input) => {
    await actionRateLimit(input.workspaceId);
    const ctx = await requireRole(input.workspaceId, "EDITOR");
    const report = await prisma.report.findUnique({
      where: { id: input.reportId },
      select: { workspaceId: true, status: true },
    });
    if (!report || report.workspaceId !== input.workspaceId) {
      return { ok: false as const, error: "not-found" as const };
    }
    if (report.status !== "FAILED") {
      return { ok: false as const, error: "not-failed" as const };
    }
    await prisma.report.update({
      where: { id: input.reportId },
      data: { status: "QUEUED", error: null, startedAt: null, finishedAt: null },
    });
    await queues.reportGenerate.add(
      "generate",
      { reportId: input.reportId, workspaceId: input.workspaceId },
      { jobId: `rpt-retry-${input.reportId}-${Date.now()}` },
    );
    revalidatePath(`/app/w/${ctx.workspace.slug}/reports`);
    return { ok: true as const };
  },
);
