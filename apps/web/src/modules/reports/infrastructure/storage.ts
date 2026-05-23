import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Object storage adapter — Supabase Storage.
 *
 * Bucket layout (single bucket per environment for simplicity):
 *
 *   reports/<workspaceId>/<reportId>.pdf
 *
 * Path scoping under `workspaceId` means a misconfigured policy can't
 * cross-tenant. We never return public URLs — the share endpoint
 * generates short-lived signed URLs at view time so revocation is
 * effective immediately.
 */

const BUCKET = process.env.REPORTS_BUCKET ?? "reports";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 min — must be re-signed per view

export const reportStorage = {
  pathFor(workspaceId: string, reportId: string): string {
    return `${workspaceId}/${reportId}.pdf`;
  },

  async uploadPdf(input: {
    workspaceId: string;
    reportId: string;
    bytes: Buffer;
  }): Promise<{ path: string; size: number }> {
    const path = reportStorage.pathFor(input.workspaceId, input.reportId);
    const { error } = await adminClient()
      .storage.from(BUCKET)
      .upload(path, input.bytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (error) {
      logger.error({ err: error.message, path }, "reports.storage: upload failed");
      throw new Error(`storage upload failed: ${error.message}`);
    }
    return { path, size: input.bytes.byteLength };
  },

  async signDownload(path: string): Promise<string> {
    const { data, error } = await adminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
        download: true,
      });
    if (error || !data?.signedUrl) {
      throw new Error(`storage sign failed: ${error?.message ?? "unknown"}`);
    }
    return data.signedUrl;
  },

  async signInline(path: string): Promise<string> {
    // Inline = browser previews the PDF instead of downloading.
    const { data, error } = await adminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      throw new Error(`storage sign failed: ${error?.message ?? "unknown"}`);
    }
    return data.signedUrl;
  },

  async delete(path: string): Promise<void> {
    await adminClient().storage.from(BUCKET).remove([path]);
  },
};
