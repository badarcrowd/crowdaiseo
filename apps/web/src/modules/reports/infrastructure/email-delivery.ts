import "server-only";
import { logger } from "@/lib/logger";

/**
 * Email delivery for completed reports.
 *
 * Adapter pattern: we never call a vendor SDK directly. Replace this
 * implementation with Resend / Postmark / SES when ready. The producer
 * side (worker) doesn't change.
 */

export type ReportEmailInput = {
  to: string;
  subject: string;
  brandName: string;
  reportTitle: string;
  // One-time download URL (signed Supabase storage URL) OR a long-lived
  // public share URL.
  downloadUrl: string;
  // When set, a friendly HTML link to the live share page.
  shareUrl?: string;
};

export const sendReportEmail = async (
  input: ReportEmailInput,
): Promise<{ ok: boolean; error?: string }> => {
  // Dev: log + return success so the rest of the pipeline is exercised.
  if (process.env.NODE_ENV !== "production") {
    logger.info(
      {
        to: input.to,
        subject: input.subject,
        downloadUrl: input.downloadUrl,
        shareUrl: input.shareUrl ?? null,
      },
      "[reports] email (dev stub)",
    );
    return { ok: true };
  }
  // TODO: wire to vendor — see lib/email/templates. The HTML below is
  // intentionally minimal; replace with a templated send when the
  // vendor adapter is in place.
  logger.warn(
    { to: input.to },
    "reports.email: production sender not wired — message dropped",
  );
  return { ok: false, error: "no-sender-configured" };
};
