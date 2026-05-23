import type {
  CrawlStatus,
  CrawlPageStatus,
  IssueCategory,
  IssueSeverity,
} from "@prisma/client";

export type CrawlOptions = {
  rootUrl: string;
  maxPages: number;
  maxDepth: number;
  respectRobots: boolean;
  userAgent: string;
};

export const DEFAULT_USER_AGENT =
  "AIVBot/1.0 (+https://aiv.dev/bot; compatible)";

export type Crawl = {
  id: string;
  workspaceId: string;
  projectId: string;
  rootUrl: string;
  status: CrawlStatus;
  options: CrawlOptions;
};

export type FetchedResource = {
  url: string;
  finalUrl: string;        // after redirects
  redirectChain: string[];
  httpStatus: number;
  contentType: string | null;
  html: string | null;     // null for non-HTML or errors
  bytes: number;
  durationMs: number;
  error?: string;
};

export type ExtractedPage = {
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  links: { internal: string[]; external: string[] };
  wordCount: number;
  imagesMissingAlt: number;
  schemas: unknown[]; // JSON-LD blocks (raw parsed)
};

export type DetectedIssue = {
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  details?: Record<string, unknown>;
};

export type RobotsTxt = {
  url: string;
  raw: string;
  rules: Array<{ userAgent: string; allow: string[]; disallow: string[] }>;
  sitemaps: string[];
};

export type Sitemap = {
  url: string;
  urls: string[];
};

export type CrawlPageRecord = {
  id: string;
  url: string;
  status: CrawlPageStatus;
};
