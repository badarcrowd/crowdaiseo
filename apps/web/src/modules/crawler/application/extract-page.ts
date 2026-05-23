import type { ExtractedPage } from "../domain/entities";
import { resolveHref, sameOrigin, looksLikeAsset } from "../domain/url";

/**
 * Regex-based HTML extractor. We deliberately avoid bringing in a DOM
 * parser dep — for production-grade parsing the Playwright fetcher will
 * give us a real DOM and we can swap implementations behind the same
 * interface. This regex version is fine for ~95% of pages and is fast
 * enough to run on millions of pages without scaling JSDOM.
 */
export const extractFromHtml = (
  finalUrl: string,
  html: string,
): ExtractedPage => {
  const get = (re: RegExp) => {
    const m = re.exec(html);
    return m ? decodeHtmlEntities(m[1].trim()) : null;
  };

  const title = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = getMeta(html, "description");
  const metaRobots = getMeta(html, "robots");
  const canonical = getLink(html, "canonical");
  const ogTitle = getProperty(html, "og:title");
  const ogDescription = getProperty(html, "og:description");
  const ogImage = getProperty(html, "og:image");

  const headings = {
    h1: collectTagText(html, "h1"),
    h2: collectTagText(html, "h2"),
    h3: collectTagText(html, "h3"),
  };

  const { internal, external } = collectLinks(html, finalUrl);

  const text = stripHtml(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const imagesMissingAlt = countImagesMissingAlt(html);
  const schemas = extractJsonLd(html);

  return {
    title,
    metaDescription,
    metaRobots,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    headings,
    links: { internal, external },
    wordCount,
    imagesMissingAlt,
    schemas,
  };
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const getMeta = (html: string, name: string): string | null => {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`,
    "i",
  );
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
};

const getProperty = (html: string, prop: string): string | null => {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${prop}["']`,
    "i",
  );
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
};

const getLink = (html: string, rel: string): string | null => {
  const re = new RegExp(
    `<link[^>]+rel=["']${rel}["'][^>]*href=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<link[^>]+href=["']([^"']+)["'][^>]*rel=["']${rel}["']`,
    "i",
  );
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
};

const collectTagText = (html: string, tag: string): string[] => {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]).trim();
    if (text) out.push(text);
  }
  return out;
};

const collectLinks = (html: string, baseUrl: string) => {
  const re = /<a\b[^>]*href=["']([^"']+)["']/gi;
  const internal: string[] = [];
  const external: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const resolved = resolveHref(baseUrl, m[1]);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    if (looksLikeAsset(resolved)) continue;
    (sameOrigin(baseUrl, resolved) ? internal : external).push(resolved);
  }
  return { internal, external };
};

const countImagesMissingAlt = (html: string): number => {
  let count = 0;
  const re = /<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (!/\balt\s*=/.test(attrs)) count++;
  }
  return count;
};

const extractJsonLd = (html: string): unknown[] => {
  const re =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // skip malformed JSON-LD
    }
  }
  return out;
};

const stripHtml = (s: string) =>
  s
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

const decodeHtmlEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
