/**
 * Strongly-typed payload definitions per queue. Producers and consumers
 * import from here so payload shape changes break compilation.
 */

export type AiVisibilityScanPayload = {
  scanId: string;
  workspaceId: string;
  projectId: string;
  promptIds: string[];
  providers: Array<"OPENAI" | "ANTHROPIC" | "GOOGLE" | "PERPLEXITY">;
  triggeredBy?: string; // userId
};

export type SeoAuditPayload = {
  workspaceId: string;
  projectId: string;
  urls: string[];
};

export type AiPromptRunPayload = {
  workspaceId: string;
  promptId: string;
  provider: "anthropic" | "openai" | "google" | "perplexity";
  metadata?: Record<string, unknown>;
};

export type CrawlStartPayload = {
  crawlId: string;
  workspaceId: string;
  projectId: string;
  rootUrl: string;
  maxPages: number;
  maxDepth: number;
  respectRobots: boolean;
  userAgent?: string;
};

export type CrawlPagePayload = {
  crawlId: string;
  url: string;
  depth: number;
  origin: string; // host — for per-origin rate limiting
};

export type NotificationSendPayload = {
  workspaceId: string;
  userId: string;
  channel: "email" | "in_app" | "webhook";
  template: string;
  data: Record<string, unknown>;
};

export type ReportGeneratePayload = {
  reportId: string;
  workspaceId: string;
  // When set, the worker will deliver to these recipients after rendering.
  emailRecipients?: string[];
  // When true, also create a public share link and include it in the email.
  createShare?: boolean;
};

export type ReportScheduleTickPayload = {
  // No payload — the worker queries due schedules on every tick.
  tickedAt?: string;
};

export type ExecutiveInsightWeeklyTickPayload = {
  // No payload — the worker queries active projects on every tick.
  tickedAt?: string;
};
