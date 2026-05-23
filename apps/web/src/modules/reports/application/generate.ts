import "server-only";
import { logger } from "@/lib/logger";
import { reportRepository } from "../infrastructure/report.repository";
import { reportStorage } from "../infrastructure/storage";
import { sendReportEmail } from "../infrastructure/email-delivery";
import { createShareToken } from "../infrastructure/share-tokens";
import {
  DEFAULT_BRANDING,
  type ReportBranding,
  type ReportParameters,
} from "../domain/types";
import { resolveTemplate } from "./templates";
import { renderReportHtml } from "./render-html";
import { renderHtmlToPdf } from "./render-pdf";
import { generateAiSummary } from "./ai-summary";

/**
 * Report generation orchestrator.
 *
 * Called by the queue worker. Performs the full pipeline:
 *   1. Mark RENDERING.
 *   2. Run template → ReportContent.
 *   3. Optional AI summary.
 *   4. Render HTML → PDF.
 *   5. Upload to storage.
 *   6. Persist (status COMPLETED + payload + branding snapshot).
 *   7. Optional share-link creation + email delivery.
 *
 * Errors at any step set status FAILED with the message. Caller (the
 * worker) does NOT re-throw retryable errors after a single attempt
 * because Playwright failures are usually deterministic; relying on
 * BullMQ's retry would just produce N identical FAILED rows.
 */

export type GenerateInput = {
  reportId: string;
  workspaceId: string;
  emailRecipients?: string[];
  createShare?: boolean;
};

export const generateReport = async (input: GenerateInput): Promise<void> => {
  const { reportId, workspaceId } = input;

  const report = await reportRepository.getById(reportId);
  if (!report) {
    logger.warn({ reportId }, "reports.generate: row missing");
    return;
  }
  if (report.status !== "QUEUED" && report.status !== "RENDERING") {
    // Idempotency: someone else already worked this one.
    logger.info({ reportId, status: report.status }, "reports.generate: skip (already worked)");
    return;
  }

  try {
    await reportRepository.markRendering(reportId);

    // ---- Resolve template + branding ----
    const branding = await loadBranding(workspaceId);
    const templateFn = resolveTemplate(report.template);

    // ---- Run template ----
    const content = await templateFn({
      workspaceId,
      projectId: report.projectId,
      parameters: (report.parameters as unknown as ReportParameters) ?? {},
    });

    // ---- Optional AI summary ----
    const params = (report.parameters as unknown as ReportParameters) ?? {};
    let aiSummary: string | null = null;
    if (params.includeAiSummary !== false) {
      try {
        aiSummary = await generateAiSummary(content);
      } catch (err) {
        // AI is optional — log and move on.
        logger.warn(
          { reportId, err: err instanceof Error ? err.message : err },
          "reports.generate: ai summary failed (continuing)",
        );
      }
    }

    // ---- Render PDF ----
    const html = renderReportHtml(content, branding, {
      aiSummaryMarkdown: aiSummary ?? undefined,
    });
    const pdf = await renderHtmlToPdf(html);

    // ---- Upload ----
    const { path, size } = await reportStorage.uploadPdf({
      workspaceId,
      reportId,
      bytes: pdf,
    });

    // ---- Persist ----
    await reportRepository.markCompleted({
      reportId,
      storagePath: path,
      pdfBytes: size,
      payload: content,
      aiSummary,
      branding,
    });

    // ---- Share link ----
    let shareUrl: string | undefined;
    if (input.createShare) {
      const token = createShareToken(reportId);
      const share = await reportRepository.createShare({
        reportId,
        workspaceId,
        token,
        expiresAt: null,
        passwordHash: null,
        createdById: report.triggeredById,
      });
      shareUrl = `/reports/share/${share.token}`;
    }

    // ---- Email delivery ----
    if (input.emailRecipients && input.emailRecipients.length > 0) {
      const downloadUrl = await reportStorage.signDownload(path);
      for (const to of input.emailRecipients) {
        try {
          const result = await sendReportEmail({
            to,
            subject: `Report ready: ${report.title}`,
            brandName: branding.brandName,
            reportTitle: report.title,
            downloadUrl,
            shareUrl,
          });
          await reportRepository.recordDelivery({
            reportId,
            channel: "EMAIL",
            target: to,
            status: result.ok ? "SENT" : "FAILED",
            error: result.error,
          });
        } catch (err) {
          await reportRepository.recordDelivery({
            reportId,
            channel: "EMAIL",
            target: to,
            status: "FAILED",
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }

    logger.info(
      { reportId, template: report.template, pdfBytes: size },
      "reports.generate: completed",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    logger.error({ reportId, err: msg }, "reports.generate: failed");
    await reportRepository.markFailed(reportId, msg);
    throw err; // surface to worker for DLQ
  }
};

const loadBranding = async (workspaceId: string): Promise<ReportBranding> => {
  const wl = await reportRepository.getWhiteLabel(workspaceId);
  if (!wl) return DEFAULT_BRANDING;
  return {
    brandName: wl.brandName,
    logoUrl: wl.logoUrl,
    primaryColor: wl.primaryColor,
    accentColor: wl.accentColor,
    footerText: wl.footerText,
  };
};
