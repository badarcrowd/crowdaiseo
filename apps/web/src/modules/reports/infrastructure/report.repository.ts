import "server-only";
import type {
  Prisma,
  ReportStatus,
  ReportTemplate,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type { ReportContent, ReportBranding } from "../domain/types";

export const reportRepository = {
  async createReport(input: {
    workspaceId: string;
    projectId: string | null;
    template: ReportTemplate;
    title: string;
    parameters: Record<string, unknown>;
    scheduleId?: string | null;
    triggeredById?: string | null;
  }) {
    return prisma.report.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        template: input.template,
        title: input.title,
        parameters: input.parameters as Prisma.InputJsonValue,
        status: "QUEUED",
        scheduleId: input.scheduleId ?? null,
        triggeredById: input.triggeredById ?? null,
      },
    });
  },

  async markRendering(reportId: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: { status: "RENDERING", startedAt: new Date() },
    });
  },

  async markCompleted(input: {
    reportId: string;
    storagePath: string;
    pdfBytes: number;
    payload: ReportContent;
    aiSummary: string | null;
    branding: ReportBranding;
  }) {
    return prisma.report.update({
      where: { id: input.reportId },
      data: {
        status: "COMPLETED",
        storagePath: input.storagePath,
        pdfBytes: input.pdfBytes,
        payload: input.payload as unknown as Prisma.InputJsonValue,
        aiSummary: input.aiSummary,
        brandingSnapshot: input.branding as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
  },

  async markFailed(reportId: string, error: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: { status: "FAILED", error, finishedAt: new Date() },
    });
  },

  async getById(reportId: string) {
    return prisma.report.findUnique({ where: { id: reportId } });
  },

  async listReports(input: {
    workspaceId: string;
    projectId?: string;
    status?: ReportStatus;
    limit?: number;
  }) {
    return prisma.report.findMany({
      where: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        status: input.status,
      },
      orderBy: { createdAt: "desc" },
      take: input.limit ?? 50,
      select: {
        id: true,
        workspaceId: true,
        projectId: true,
        template: true,
        title: true,
        status: true,
        pdfBytes: true,
        scheduleId: true,
        createdAt: true,
        finishedAt: true,
        error: true,
      },
    });
  },

  // ---- Schedules ----
  async createSchedule(input: {
    workspaceId: string;
    projectId: string | null;
    template: ReportTemplate;
    title: string;
    parameters: Record<string, unknown>;
    cron: string;
    timezone?: string;
    recipients: string[];
    createdById: string | null;
    nextRunAt: Date;
  }) {
    return prisma.reportSchedule.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        template: input.template,
        title: input.title,
        parameters: input.parameters as Prisma.InputJsonValue,
        cron: input.cron,
        timezone: input.timezone ?? "UTC",
        recipients: input.recipients,
        createdById: input.createdById,
        nextRunAt: input.nextRunAt,
      },
    });
  },

  async listDueSchedules(now: Date) {
    return prisma.reportSchedule.findMany({
      where: { active: true, nextRunAt: { lte: now } },
      take: 100,
    });
  },

  async markScheduleRan(scheduleId: string, nextRunAt: Date) {
    return prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { lastRunAt: new Date(), nextRunAt },
    });
  },

  // ---- Shares ----
  async createShare(input: {
    reportId: string;
    workspaceId: string;
    token: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    createdById: string | null;
  }) {
    return prisma.reportShare.create({
      data: {
        reportId: input.reportId,
        workspaceId: input.workspaceId,
        token: input.token,
        expiresAt: input.expiresAt,
        passwordHash: input.passwordHash,
        createdById: input.createdById,
      },
    });
  },

  async findShareByToken(token: string) {
    return prisma.reportShare.findUnique({
      where: { token },
      include: { report: true },
    });
  },

  async recordShareView(shareId: string) {
    return prisma.reportShare.update({
      where: { id: shareId },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  },

  async revokeShare(shareId: string) {
    return prisma.reportShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  },

  // ---- Deliveries ----
  async recordDelivery(input: {
    reportId: string;
    channel: "EMAIL" | "WEBHOOK" | "IN_APP";
    target: string;
    status: "QUEUED" | "SENT" | "FAILED" | "BOUNCED";
    error?: string;
  }) {
    return prisma.reportDelivery.create({
      data: {
        reportId: input.reportId,
        channel: input.channel,
        target: input.target,
        status: input.status,
        error: input.error,
        deliveredAt: input.status === "SENT" ? new Date() : null,
      },
    });
  },

  // ---- White label ----
  async getWhiteLabel(workspaceId: string) {
    return prisma.whiteLabelConfig.findUnique({ where: { workspaceId } });
  },

  async upsertWhiteLabel(workspaceId: string, data: {
    brandName: string;
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    footerText?: string | null;
    shareDomain?: string | null;
  }) {
    return prisma.whiteLabelConfig.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    });
  },
};
