import "server-only";
import type { ReportStatus, ReportTemplate } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { reportStorage } from "../infrastructure/storage";
import { reportRepository } from "../infrastructure/report.repository";

/**
 * Read-side for the reports UI.
 *
 * All listing endpoints scope by workspaceId. Download / share endpoints
 * are protected by either workspace membership (private downloads) or
 * the HMAC token (public shares).
 */

export const reportQueries = {
  async listReports(input: {
    workspaceId: string;
    projectId?: string;
    template?: ReportTemplate;
    status?: ReportStatus;
    limit?: number;
  }) {
    return reportRepository.listReports({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      status: input.status,
      limit: input.limit,
    });
  },

  async getReport(workspaceId: string, reportId: string) {
    const report = await reportRepository.getById(reportId);
    if (!report || report.workspaceId !== workspaceId) return null;
    return report;
  },

  /**
   * Signed URL for an authenticated workspace member.
   * Authorization MUST be performed by the caller before invoking this.
   */
  async signDownloadUrl(workspaceId: string, reportId: string) {
    const report = await reportRepository.getById(reportId);
    if (!report || report.workspaceId !== workspaceId) return null;
    if (!report.storagePath) return null;
    return reportStorage.signDownload(report.storagePath);
  },

  async listSchedules(workspaceId: string) {
    return prisma.reportSchedule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  },

  async listShares(workspaceId: string, reportId: string) {
    return prisma.reportShare.findMany({
      where: { reportId, workspaceId },
      orderBy: { createdAt: "desc" },
    });
  },

  async listDeliveries(reportId: string) {
    return prisma.reportDelivery.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });
  },
};
