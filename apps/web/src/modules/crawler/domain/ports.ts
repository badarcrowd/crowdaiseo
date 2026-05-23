import type {
  Crawl,
  DetectedIssue,
  ExtractedPage,
  FetchedResource,
  RobotsTxt,
  Sitemap,
} from "./entities";

/**
 * Fetches an HTTP resource. Implementations may use a static HTTP client
 * (fast, cheap) or a headless browser (slower, executes JS).
 */
export interface Fetcher {
  fetch(url: string, opts: { userAgent: string }): Promise<FetchedResource>;
  close?(): Promise<void>;
}

/**
 * Per-origin rate limiter. `acquire` blocks until a permit is available
 * (or rejects when the deadline elapses).
 */
export interface RateLimiter {
  acquire(key: string, opts?: { timeoutMs?: number }): Promise<void>;
}

/**
 * Frontier: tracks which URLs have been seen/enqueued for a given crawl.
 * Backed by Redis sets so multiple workers stay coherent.
 */
export interface CrawlFrontier {
  /** Add a URL to the seen set. Returns true if newly added. */
  markSeen(crawlId: string, normalizedUrl: string): Promise<boolean>;
  count(crawlId: string): Promise<number>;
  clear(crawlId: string): Promise<void>;
}

export interface CrawlRepository {
  getCrawl(id: string): Promise<Crawl | null>;
  startCrawl(id: string): Promise<void>;
  finishCrawl(
    id: string,
    outcome: { status: "COMPLETED" | "FAILED" | "CANCELLED"; error?: string },
  ): Promise<void>;
  incrementCounters(
    id: string,
    counters: Partial<{
      pagesFound: number;
      pagesCrawled: number;
      pagesFailed: number;
      issuesFound: number;
    }>,
  ): Promise<void>;
  recordRobotsTxt(id: string, robots: RobotsTxt): Promise<void>;
  recordSitemap(id: string, sitemap: Sitemap): Promise<void>;

  // Pages
  upsertQueuedPage(input: {
    crawlId: string;
    url: string;
    normalizedUrl: string;
    depth: number;
  }): Promise<{ id: string; created: boolean }>;
  beginFetch(pageId: string): Promise<void>;
  savePageResult(input: {
    pageId: string;
    crawlId: string;
    fetched: FetchedResource;
    extracted: ExtractedPage | null;
    issues: DetectedIssue[];
  }): Promise<void>;
  markPageFailed(pageId: string, error: string): Promise<void>;
  markPageSkipped(pageId: string, reason: string): Promise<void>;
  /**
   * Atomically check if a crawl has no remaining QUEUED/FETCHING pages
   * and transition it from RUNNING → COMPLETED. Returns true when the
   * crawl was finalized by this call (false if still in progress or
   * already finished by a concurrent worker).
   */
  tryFinalizeCrawl(id: string): Promise<boolean>;
}
