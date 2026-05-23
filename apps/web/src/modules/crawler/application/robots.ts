import type { RobotsTxt } from "../domain/entities";

/**
 * Minimal robots.txt parser. Supports User-agent, Allow, Disallow,
 * Sitemap. Group resolution picks the most specific UA group (exact
 * match first, then "*"). Path matching is RFC-9309-compatible: longest
 * match wins, with `*` and `$` wildcards.
 *
 * Not a full implementation — intentional. It covers what real-world
 * sites use 99% of the time and stays under 100 lines.
 */
export const parseRobotsTxt = (url: string, raw: string): RobotsTxt => {
  type Group = { userAgent: string; allow: string[]; disallow: string[] };
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let current: Group | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const stripped = line.split("#")[0].trim();
    if (!stripped) continue;
    const idx = stripped.indexOf(":");
    if (idx === -1) continue;
    const key = stripped.slice(0, idx).trim().toLowerCase();
    const value = stripped.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (current && (current.allow.length || current.disallow.length)) {
        groups.push(current);
      }
      current = { userAgent: value.toLowerCase(), allow: [], disallow: [] };
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value);
    } else if (key === "disallow" && current) {
      // Empty disallow = allow all; we represent that as no rule.
      if (value) current.disallow.push(value);
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  if (current) groups.push(current);

  return { url, raw, rules: groups, sitemaps };
};

/**
 * Decide whether a URL is fetchable for our UA. Longest-match wins; ties
 * resolve in favor of Allow.
 */
export const isAllowedByRobots = (
  robots: RobotsTxt,
  userAgent: string,
  url: string,
): boolean => {
  const ua = userAgent.toLowerCase();
  const path = new URL(url).pathname || "/";

  // Pick the specific UA group; fall back to "*".
  const specific = robots.rules.find((g) =>
    g.userAgent !== "*" && ua.includes(g.userAgent),
  );
  const wildcard = robots.rules.find((g) => g.userAgent === "*");
  const group = specific ?? wildcard;
  if (!group) return true;

  const match = (pattern: string) => matchesPattern(path, pattern);

  let best: { len: number; allow: boolean } | null = null;
  for (const p of group.allow) {
    if (match(p) && (best === null || p.length > best.len)) {
      best = { len: p.length, allow: true };
    }
  }
  for (const p of group.disallow) {
    if (match(p) && (best === null || p.length > best.len)) {
      best = { len: p.length, allow: false };
    }
  }
  return best ? best.allow : true;
};

const matchesPattern = (path: string, pattern: string): boolean => {
  if (!pattern) return true;
  // Build regex: escape regex chars, then translate * to .* and $ as end-anchor.
  let rx = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") rx += ".*";
    else if (c === "$" && i === pattern.length - 1) rx += "$";
    else rx += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(rx).test(path);
};

export const candidateRobotsUrls = (rootUrl: string): string[] => {
  const u = new URL(rootUrl);
  return [`${u.origin}/robots.txt`];
};
