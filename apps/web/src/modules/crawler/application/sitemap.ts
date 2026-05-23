import { gunzipSync } from "node:zlib";
import type { Sitemap } from "../domain/entities";

/**
 * Lightweight sitemap parser. Handles:
 *   - urlset (regular sitemaps)
 *   - sitemapindex (recursive — caller fetches children)
 *   - gzipped sitemaps (.xml.gz)
 *
 * We avoid a full XML parser dependency by using regex on well-formed
 * sitemaps. If a site emits malformed XML we degrade gracefully (return
 * an empty list) rather than throw.
 */

export type ParsedSitemap = {
  url: string;
  kind: "urlset" | "sitemapindex";
  entries: string[]; // urls (urlset) or child sitemaps (sitemapindex)
};

export const parseSitemap = (
  url: string,
  body: Buffer | string,
): ParsedSitemap => {
  const raw = decompressIfGzipped(url, body);
  const text = typeof raw === "string" ? raw : raw.toString("utf-8");

  if (/<sitemapindex/i.test(text)) {
    return {
      url,
      kind: "sitemapindex",
      entries: extractLocs(text),
    };
  }
  return {
    url,
    kind: "urlset",
    entries: extractLocs(text),
  };
};

const decompressIfGzipped = (
  url: string,
  body: Buffer | string,
): Buffer | string => {
  if (typeof body === "string") return body;
  if (url.endsWith(".gz") || (body[0] === 0x1f && body[1] === 0x8b)) {
    try {
      return gunzipSync(body);
    } catch {
      // fall through — let extractLocs fail to empty
    }
  }
  return body;
};

const extractLocs = (xml: string): string[] => {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = decodeXmlEntities(m[1].trim());
    if (v) out.push(v);
  }
  return out;
};

const decodeXmlEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * Candidate sitemap URLs to probe when robots.txt does not advertise one.
 */
export const candidateSitemapUrls = (rootUrl: string): string[] => {
  const u = new URL(rootUrl);
  return [
    `${u.origin}/sitemap.xml`,
    `${u.origin}/sitemap_index.xml`,
    `${u.origin}/sitemap-index.xml`,
  ];
};

/**
 * Flatten a sitemap entry — caller passes a fetcher to recurse. Bounded
 * by `maxUrls` to protect against pathological sitemaps.
 */
export const flattenSitemap = async (
  initial: ParsedSitemap,
  fetchText: (url: string) => Promise<Buffer | string | null>,
  maxUrls = 50_000,
): Promise<Sitemap> => {
  const urls = new Set<string>();
  const queue: string[] = [initial.url];
  const seenIndex = new Set<string>([initial.url]);

  const ingest = (sm: ParsedSitemap) => {
    if (sm.kind === "urlset") {
      for (const u of sm.entries) {
        urls.add(u);
        if (urls.size >= maxUrls) return;
      }
    } else {
      for (const child of sm.entries) {
        if (!seenIndex.has(child)) {
          seenIndex.add(child);
          queue.push(child);
        }
      }
    }
  };

  ingest(initial);

  while (queue.length && urls.size < maxUrls) {
    const next = queue.shift()!;
    if (next === initial.url) continue;
    const body = await fetchText(next);
    if (!body) continue;
    ingest(parseSitemap(next, body));
  }

  return { url: initial.url, urls: [...urls] };
};
