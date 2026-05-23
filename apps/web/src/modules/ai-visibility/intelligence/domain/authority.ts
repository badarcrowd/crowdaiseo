/**
 * Curated authority weights for well-known citation sources.
 *
 * These power the citation-authority bonus in scoring and the citation
 * opportunity detector. Values are heuristic (0..1) and intentionally
 * coarse — the goal is to distinguish "Wikipedia" from "random blog",
 * not to rank every domain on the internet.
 *
 * Pattern matching is suffix-based on the registrable domain. Subdomains
 * inherit (so `en.wikipedia.org` matches `wikipedia.org`).
 *
 * Tuning happens here, not in code. If a customer's analysis surfaces a
 * domain that should be weighted differently, add or update the entry.
 */
export const AUTHORITY_TABLE: ReadonlyArray<{
  pattern: RegExp;
  authority: number;
  category: "encyclopedia" | "news" | "social" | "academic" | "government" | "review" | "developer";
}> = [
  // Encyclopedia / reference
  { pattern: /(^|\.)wikipedia\.org$/, authority: 0.95, category: "encyclopedia" },
  { pattern: /(^|\.)britannica\.com$/, authority: 0.85, category: "encyclopedia" },

  // News / mainstream media
  { pattern: /(^|\.)reuters\.com$/, authority: 0.9, category: "news" },
  { pattern: /(^|\.)bbc\.(co\.uk|com)$/, authority: 0.9, category: "news" },
  { pattern: /(^|\.)nytimes\.com$/, authority: 0.9, category: "news" },
  { pattern: /(^|\.)theguardian\.com$/, authority: 0.85, category: "news" },
  { pattern: /(^|\.)bloomberg\.com$/, authority: 0.85, category: "news" },
  { pattern: /(^|\.)wsj\.com$/, authority: 0.85, category: "news" },

  // Government / standards
  { pattern: /\.gov$/, authority: 0.95, category: "government" },
  { pattern: /\.gov\.[a-z]{2}$/, authority: 0.95, category: "government" },
  { pattern: /(^|\.)w3\.org$/, authority: 0.9, category: "academic" },

  // Academic
  { pattern: /\.edu$/, authority: 0.85, category: "academic" },
  { pattern: /(^|\.)arxiv\.org$/, authority: 0.85, category: "academic" },
  { pattern: /(^|\.)nature\.com$/, authority: 0.9, category: "academic" },

  // Developer / technical
  { pattern: /(^|\.)github\.com$/, authority: 0.8, category: "developer" },
  { pattern: /(^|\.)stackoverflow\.com$/, authority: 0.8, category: "developer" },
  { pattern: /(^|\.)developer\.mozilla\.org$/, authority: 0.85, category: "developer" },

  // Social (lower authority but high recommendation influence on some providers)
  { pattern: /(^|\.)reddit\.com$/, authority: 0.65, category: "social" },
  { pattern: /(^|\.)youtube\.com$/, authority: 0.6, category: "social" },
  { pattern: /(^|\.)medium\.com$/, authority: 0.55, category: "social" },
  { pattern: /(^|\.)linkedin\.com$/, authority: 0.55, category: "social" },
  { pattern: /(^|\.)quora\.com$/, authority: 0.5, category: "social" },

  // Reviews
  { pattern: /(^|\.)trustpilot\.com$/, authority: 0.65, category: "review" },
  { pattern: /(^|\.)g2\.com$/, authority: 0.7, category: "review" },
  { pattern: /(^|\.)capterra\.com$/, authority: 0.65, category: "review" },
];

export const DEFAULT_AUTHORITY = 0.3;

export const domainAuthority = (domain: string): number => {
  const d = domain.toLowerCase();
  for (const entry of AUTHORITY_TABLE) {
    if (entry.pattern.test(d)) return entry.authority;
  }
  return DEFAULT_AUTHORITY;
};

export const domainCategory = (domain: string): string | null => {
  const d = domain.toLowerCase();
  for (const entry of AUTHORITY_TABLE) {
    if (entry.pattern.test(d)) return entry.category;
  }
  return null;
};
