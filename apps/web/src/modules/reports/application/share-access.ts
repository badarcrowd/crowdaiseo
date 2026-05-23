import "server-only";
import { reportRepository } from "../infrastructure/report.repository";
import { reportStorage } from "../infrastructure/storage";
import { verifyShareToken } from "../infrastructure/share-tokens";

/**
 * Public share access — used by the /reports/share/[token] route.
 *
 * Three checks must pass:
 *   1. The token verifies against the share's reportId (HMAC).
 *   2. The share isn't revoked and isn't past its expiry.
 *   3. The associated report is COMPLETED with a stored PDF.
 *
 * Optional password (bcrypt-hashed) is enforced by the route handler,
 * not here — we keep this layer focused on verification + URL signing.
 */

export type ShareAccessResult =
  | { ok: true; reportId: string; title: string; signedPdfUrl: string; viewCount: number }
  | { ok: false; reason: "not-found" | "expired" | "revoked" | "incomplete" };

export const accessShare = async (token: string): Promise<ShareAccessResult> => {
  const share = await reportRepository.findShareByToken(token);
  if (!share) return { ok: false, reason: "not-found" };
  if (share.revokedAt) return { ok: false, reason: "revoked" };
  if (share.expiresAt && share.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (!verifyShareToken(token, share.reportId)) {
    // Token row exists but signature doesn't match the report. Treat as
    // not-found to avoid leaking which arm of the check failed.
    return { ok: false, reason: "not-found" };
  }
  const report = share.report;
  if (report.status !== "COMPLETED" || !report.storagePath) {
    return { ok: false, reason: "incomplete" };
  }
  const signedPdfUrl = await reportStorage.signInline(report.storagePath);
  // Fire-and-forget — don't block render on counter increment.
  void reportRepository.recordShareView(share.id).catch(() => null);
  return {
    ok: true,
    reportId: report.id,
    title: report.title,
    signedPdfUrl,
    viewCount: share.viewCount + 1,
  };
};
