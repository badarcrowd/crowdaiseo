/**
 * URL helpers. Crawlers live or die on URL normalization — every
 * function here is pure and tested.
 */

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "mc_cid", "mc_eid", "_ga", "ref",
]);

/**
 * Canonicalize for dedupe:
 *   - lowercase host
 *   - drop default ports
 *   - strip fragment
 *   - sort query keys; drop tracking params
 *   - trim trailing slash on non-root paths
 */
export const normalizeUrl = (raw: string): string | null => {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = "";
  }

  // Strip tracking + sort query
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  u.search = "";
  for (const [k, v] of params) u.searchParams.append(k, v);

  // Trim trailing slash on paths beyond root
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }

  return u.toString();
};

export const sameOrigin = (a: string, b: string): boolean => {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
};

export const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Resolve a possibly-relative href against a base URL. Returns null for
 * non-fetchable links (mailto:, tel:, javascript:, etc.).
 */
export const resolveHref = (base: string, href: string): string | null => {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^(mailto|tel|javascript|data):/i.test(trimmed)
  ) {
    return null;
  }
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
};

/**
 * Filter URLs unsuitable for HTML crawling — binary asset extensions.
 */
const ASSET_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp",
  ".pdf", ".zip", ".gz", ".tar", ".rar", ".7z",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm", ".mkv",
  ".css", ".js", ".woff", ".woff2", ".ttf", ".eot", ".map",
  ".xml", // sitemaps handled separately
]);

export const looksLikeAsset = (url: string): boolean => {
  try {
    const { pathname } = new URL(url);
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot === -1) return false;
    return ASSET_EXTENSIONS.has(pathname.slice(lastDot).toLowerCase());
  } catch {
    return false;
  }
};
