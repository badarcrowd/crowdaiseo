import type { ProviderId } from "@prisma/client";

export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly status: number;
  readonly retryable: boolean;
  readonly body: string;
  /** Milliseconds to wait before retrying, parsed from Retry-After header. */
  readonly retryAfterMs: number | undefined;

  constructor(
    provider: ProviderId,
    status: number,
    body: string,
    retryAfterMs?: number,
  ) {
    super(`[${provider}] HTTP ${status}: ${truncate(body, 200)}`);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
    this.body = body;
    this.retryable = status === 429 || status >= 500;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Parse the Retry-After response header into milliseconds.
 * Handles both delta-seconds ("30") and HTTP-date formats.
 */
export const parseRetryAfter = (header: string | null): number | undefined => {
  if (!header) return undefined;
  const seconds = Number(header.trim());
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) {
    const ms = date.getTime() - Date.now();
    return ms > 0 ? ms : undefined;
  }
  return undefined;
};

export const providerError = (
  provider: ProviderId,
  status: number,
  body: string,
  retryAfterHeader?: string | null,
) => new ProviderError(provider, status, body, parseRetryAfter(retryAfterHeader ?? null));

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n)}…` : s;
