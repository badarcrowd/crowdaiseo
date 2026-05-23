import type {
  CrawlIssue,
  PromptCategory,
  ProviderId,
  RecommendationCategory,
  RecommendationDifficulty,
  RecommendationKind,
} from "@prisma/client";

// ---------------------------------------------------------------------
// Recommendation primitive
// ---------------------------------------------------------------------

export type GeneratedRecommendation = {
  category: RecommendationCategory;
  kind: RecommendationKind;
  targetKey: string;
  title: string;
  description: string;
  action: string;
  confidence: number;     // 0..1
  impactScore: number;    // 0..100
  difficulty: RecommendationDifficulty;
  evidence: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------
// Context — everything the generators read from. Loaded once per
// pipeline run; passed to every generator. Generators MUST NOT touch
// the database directly — that keeps them testable and deterministic.
// ---------------------------------------------------------------------

export type RecommendationContext = {
  project: {
    id: string;
    workspaceId: string;
    domain: string;
    name: string;
    keywords: string[];
  };
  // Latest crawl snapshot.
  crawl: {
    crawlId: string | null;
    pagesCrawled: number;
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    issues: Array<Pick<CrawlIssue, "code" | "severity" | "category" | "message">> &
      Array<{ pageId: string | null }>;
    // Aggregated issue counts by code (count, severity).
    issueCounts: Map<string, { count: number; severity: string; category: string }>;
    // Coverage signals derived from extracted pages.
    pages: Array<{
      url: string;
      title: string | null;
      metaDescription: string | null;
      wordCount: number | null;
      h1Count: number;
      hasSchema: boolean;
      hasFaqSchema: boolean;
      hasOrgSchema: boolean;
      hasArticleSchema: boolean;
      hasBreadcrumbSchema: boolean;
    }>;
  };
  // Latest visibility intelligence snapshot.
  visibility: {
    latestScore: number | null;
    confidence: number;
    sampleSize: number;
    byProvider: Record<ProviderId, number>;
    // Prompt-level mention rates by category.
    categoryMentionRate: Record<PromptCategory, number>;
    // Prompts where the brand was NOT mentioned at all in the last scan.
    weakPrompts: Array<{
      promptId: string;
      name: string;
      category: PromptCategory;
      mentionRate: number;
    }>;
  };
  // Citation intelligence: who's getting cited, and which gaps matter.
  citations: {
    opportunities: Array<{
      domain: string;
      reason: string;
      score: number;
      authority: number;
    }>;
    // Domains where the brand is conspicuously absent.
    topDomainsBrandMissing: string[];
  };
  // Competitor intelligence: who dominates what.
  competitors: {
    dominantByCategory: Map<PromptCategory, { entity: string; share: number }>;
    biggestGaps: Array<{
      entity: string;
      delta: number;
      dominantCategories: PromptCategory[];
    }>;
  };
  // Sentiment summary.
  sentiment: {
    avgScore: number;
    negativeShare: number; // 0..1
  };
};

// ---------------------------------------------------------------------
// Generator interface — pure functions over the context.
// ---------------------------------------------------------------------

export type RecommendationGenerator = (
  ctx: RecommendationContext,
) => GeneratedRecommendation[];

// ---------------------------------------------------------------------
// Prioritization
// ---------------------------------------------------------------------

export type PrioritizedRecommendation = GeneratedRecommendation & {
  priorityScore: number;
};

// Difficulty cost: how much friction the action carries. Used by the
// prioritization formula. Larger = harder = lower priority.
export const DIFFICULTY_COST: Record<RecommendationDifficulty, number> = {
  EASY: 1,
  MEDIUM: 1.6,
  HARD: 2.4,
};
