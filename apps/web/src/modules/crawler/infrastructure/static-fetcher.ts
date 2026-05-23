import type { Fetcher } from "../domain/ports";
import type { FetchedResource } from "../domain/entities";

/**
 * Pure-Node static fetcher (no browser). Use for robots.txt / sitemap
 * fetches and as a fallback for HTML when JS execution isn't required.
 * Cheap, parallelizable, and runs anywhere.
 */
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 10;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap per page

export const staticFetcher: Fetcher = {
  async fetch(url, { userAgent }) {
    const start = Date.now();
    const chain: string[] = [];
    let current = url;

    try {
      for (let i = 0; i < MAX_REDIRECTS; i++) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
        const res = await fetch(current, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": userAgent,
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        clearTimeout(t);

        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const loc = res.headers.get("location");
          if (!loc) {
            return base(current, chain, res.status, null, null, start);
          }
          chain.push(current);
          current = new URL(loc, current).toString();
          continue;
        }

        const contentType = res.headers.get("content-type");
        const isHtml = contentType?.includes("text/html") ?? false;

        // Stream-read with a byte cap.
        const reader = res.body?.getReader();
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > MAX_BYTES) {
              await reader.cancel();
              break;
            }
            chunks.push(value);
          }
        }
        const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        const text = isHtml ? buf.toString("utf-8") : null;

        return {
          url,
          finalUrl: current,
          redirectChain: chain,
          httpStatus: res.status,
          contentType,
          html: text,
          bytes,
          durationMs: Date.now() - start,
        };
      }

      return base(current, chain, 0, null, null, start, "too-many-redirects");
    } catch (err) {
      return base(
        current,
        chain,
        0,
        null,
        null,
        start,
        err instanceof Error ? err.message : "fetch-failed",
      );
    }
  },
};

const base = (
  finalUrl: string,
  chain: string[],
  status: number,
  contentType: string | null,
  html: string | null,
  start: number,
  error?: string,
): FetchedResource => ({
  url: finalUrl,
  finalUrl,
  redirectChain: chain,
  httpStatus: status,
  contentType,
  html,
  bytes: 0,
  durationMs: Date.now() - start,
  error,
});

/**
 * Convenience: GET text/buffer for robots/sitemap. Returns null on any
 * non-2xx so callers can probe candidate URLs without try/catch noise.
 */
export const fetchTextOrBuffer = async (
  url: string,
  userAgent: string,
): Promise<Buffer | null> => {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
};
