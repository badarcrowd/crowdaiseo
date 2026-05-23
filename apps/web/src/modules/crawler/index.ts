/**
 * Public surface of the crawler module. Server actions and other modules
 * should import only from here.
 */
export { startCrawl, cancelCrawl, type StartCrawlInput } from "./application/start-crawl";

// Re-export domain types that callers commonly need (read-only views).
export type {
  Crawl,
  CrawlOptions,
  ExtractedPage,
  FetchedResource,
  DetectedIssue,
  RobotsTxt,
  Sitemap,
} from "./domain/entities";

// Repository is exported so the dashboard / API can read crawl state.
export { crawlRepository } from "./infrastructure/crawl.repository";
