/**
 * Reports — public surface of the enterprise reporting system.
 *
 * Producers (server actions, cron) call into `createReportAction` /
 * `createReportScheduleAction`. Workers consume the `report.generate`
 * queue and call `generateReport` directly. The public share endpoint
 * uses `accessShare`.
 */

// Pipeline + read-side
export { generateReport } from "./application/generate";
export { tickScheduler, nextRunFromCron } from "./application/scheduler";
export { reportQueries } from "./application/queries";
export { reportRepository } from "./infrastructure/report.repository";
export { accessShare } from "./application/share-access";
export type { ShareAccessResult } from "./application/share-access";

// Renderers + templates (exported for tests / ad-hoc tooling)
export { renderReportHtml } from "./application/render-html";
export { renderHtmlToPdf, closePdfRenderer } from "./application/render-pdf";
export { resolveTemplate, TEMPLATES } from "./application/templates";
export { generateAiSummary } from "./application/ai-summary";

// Storage + tokens
export { reportStorage } from "./infrastructure/storage";
export { createShareToken, verifyShareToken } from "./infrastructure/share-tokens";

// Types
export { DEFAULT_BRANDING } from "./domain/types";
export type {
  ReportParameters,
  ReportBranding,
  ReportContent,
  ReportSection,
  ReportBlock,
  ReportTemplateFn,
  TemplateContext,
} from "./domain/types";
