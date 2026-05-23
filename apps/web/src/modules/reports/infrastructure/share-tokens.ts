import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { serverEnv } from "@/config/env";

/**
 * Share tokens are HMAC-signed opaque strings of the form:
 *
 *   <random-id>.<hmac>
 *
 * `random-id` is a fresh 16-byte url-safe token (the "nonce" that gets
 * stored on `ReportShare.token` for lookup). `hmac` is computed over
 * `random-id + reportId` keyed on the server-side secret. This means:
 *
 *   - Knowing the report id alone can't forge a share URL.
 *   - Knowing a share token from one report can't be reused for another.
 *   - We don't expose the report id in URLs (only the random token).
 *
 * On verification we look up by `random-id`, recompute the HMAC against
 * the row's reportId, and constant-time compare. Expiry + revocation
 * are checked at the same layer.
 */

const SECRET_KEY = "REPORT_SHARE_SECRET";

const secret = (): string => {
  const env = (serverEnv as unknown as Record<string, string | undefined>)[
    SECRET_KEY
  ];
  if (env) return env;
  // Fallback: derive from NEXTAUTH/SUPABASE secret so dev works without
  // a separate env var. In production set REPORT_SHARE_SECRET explicitly.
  const fallback =
    (serverEnv as unknown as Record<string, string | undefined>)[
      "SUPABASE_SERVICE_ROLE_KEY"
    ] ?? "dev-only-insecure-secret";
  return createHash("sha256").update(`report-share:${fallback}`).digest("hex");
};

export const createShareToken = (reportId: string): string => {
  const nonce = randomBytes(16).toString("base64url");
  const sig = createHmac("sha256", secret())
    .update(`${nonce}.${reportId}`)
    .digest("base64url");
  return `${nonce}.${sig}`;
};

export const verifyShareToken = (
  token: string,
  reportId: string,
): boolean => {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, providedSig] = parts;
  if (!nonce || !providedSig) return false;
  const expected = createHmac("sha256", secret())
    .update(`${nonce}.${reportId}`)
    .digest("base64url");
  // Length mismatch is itself a signal we shouldn't leak the timing of.
  if (expected.length !== providedSig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(providedSig));
  } catch {
    return false;
  }
};

/**
 * Extract the lookup-id portion of a token. The `ReportShare` row stores
 * the full token (so lookup is O(1) via the unique index), but if a
 * caller has only the URL slug, this helper exposes the nonce.
 */
export const tokenNonce = (token: string): string | null => {
  const dot = token.indexOf(".");
  return dot === -1 ? null : token.slice(0, dot);
};
