import type { PromptCategory } from "@prisma/client";
import type {
  GeneratedRecommendation,
  RecommendationGenerator,
} from "../../domain/types";

/**
 * Content recommendations.
 *
 * Reads weak-prompt signals + competitor dominance + crawl coverage to
 * surface concrete content actions. Each generator is a small pure
 * function so a CLI / unit test can feed in synthetic context and
 * verify the exact output.
 *
 * Generators emit recommendations only when evidence crosses a
 * threshold. The thresholds are intentionally conservative — surfacing
 * 50 weak recommendations is worse than surfacing 5 strong ones.
 */

const WEAK_MENTION_RATE = 0.3;
const STRONG_DOMINANCE = 0.5;
const MIN_PROMPTS_FOR_CATEGORY_INSIGHT = 3;

// ---------------------------------------------------------------------
// Missing topic clusters: a prompt category where the brand is
// consistently absent suggests the topic-cluster around that intent
// isn't covered well on-site.
// ---------------------------------------------------------------------

const topicClusterGapGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  for (const [category, rate] of Object.entries(ctx.visibility.categoryMentionRate)) {
    const cat = category as PromptCategory;
    const promptsInCat = ctx.visibility.weakPrompts.filter(
      (p) => p.category === cat,
    );
    if (rate >= WEAK_MENTION_RATE) continue;
    if (promptsInCat.length < MIN_PROMPTS_FOR_CATEGORY_INSIGHT) continue;

    const dominant = ctx.competitors.dominantByCategory.get(cat);
    const evidence: Record<string, unknown> = {
      category: cat,
      mentionRate: rate,
      weakPromptCount: promptsInCat.length,
    };
    if (dominant) evidence.dominantCompetitor = dominant.entity;

    out.push({
      category: "CONTENT",
      kind: "CONTENT_TOPIC_CLUSTER_GAP",
      targetKey: `category:${cat}`,
      title: `Build a topic cluster for ${prettyCategory(cat)} queries`,
      description: dominant
        ? `Your brand appears in only ${Math.round(rate * 100)}% of ${prettyCategory(cat)} prompts; ${dominant.entity} dominates this category. AI providers need on-site content to anchor your brand to this intent.`
        : `Your brand appears in only ${Math.round(rate * 100)}% of ${prettyCategory(cat)} prompts. There is no anchor content for AI providers to cite.`,
      action: `Publish 3-5 long-form pages covering ${prettyCategory(cat).toLowerCase()} questions. Link them as a cluster from an authoritative pillar page.`,
      confidence: clamp(0.4 + (promptsInCat.length / 10) * 0.5, 0.4, 0.95),
      impactScore: Math.round(50 + (1 - rate) * 30),
      difficulty: "HARD",
      evidence,
    });
  }
  return out;
};

// ---------------------------------------------------------------------
// FAQ opportunity: pages with little/no FAQ schema and AI being asked
// FAQ-shaped (INFORMATIONAL) questions about the space.
// ---------------------------------------------------------------------

const faqOpportunityGen: RecommendationGenerator = (ctx) => {
  const infoRate = ctx.visibility.categoryMentionRate["INFORMATIONAL"] ?? 1;
  const pagesWithFaq = ctx.crawl.pages.filter((p) => p.hasFaqSchema).length;
  const totalPages = ctx.crawl.pages.length;
  if (totalPages === 0) return [];
  const faqCoverage = pagesWithFaq / totalPages;
  if (infoRate >= 0.5 && faqCoverage >= 0.1) return [];

  return [
    {
      category: "CONTENT",
      kind: "CONTENT_FAQ_OPPORTUNITY",
      targetKey: "project:faq-coverage",
      title: "Add FAQ content with structured data",
      description: `${pagesWithFaq} of ${totalPages} crawled pages have FAQPage schema. AI providers preferentially cite FAQ-shaped content for informational queries (current rate: ${Math.round(infoRate * 100)}%).`,
      action: "Add 5-10 FAQ blocks across your highest-traffic pages and mark each with FAQPage JSON-LD.",
      confidence: 0.75,
      impactScore: 65,
      difficulty: "EASY",
      evidence: { pagesWithFaq, totalPages, infoRate },
    },
  ];
};

// ---------------------------------------------------------------------
// Comparison pages: competitor dominates COMPARISON intent and you have
// no comparison content.
// ---------------------------------------------------------------------

const comparisonPageGen: RecommendationGenerator = (ctx) => {
  const compDominant = ctx.competitors.dominantByCategory.get("COMPARISON");
  const compMentionRate = ctx.visibility.categoryMentionRate["COMPARISON"] ?? 1;
  if (!compDominant || compMentionRate >= 0.5) return [];
  return [
    {
      category: "CONTENT",
      kind: "CONTENT_COMPARISON_PAGE",
      targetKey: `comparison:${compDominant.entity.toLowerCase()}`,
      title: `Publish a "${ctx.project.name} vs ${compDominant.entity}" comparison page`,
      description: `${compDominant.entity} captured ${Math.round(compDominant.share * 100)}% share-of-voice on comparison prompts. AI providers default to citing whoever frames the comparison first.`,
      action: `Create an honest, well-structured comparison page covering pricing, features, and use-cases. Use a comparison table with structured data.`,
      confidence: 0.8,
      impactScore: 70,
      difficulty: "MEDIUM",
      evidence: {
        competitor: compDominant.entity,
        share: compDominant.share,
        comparisonMentionRate: compMentionRate,
      },
    },
  ];
};

// ---------------------------------------------------------------------
// Semantic gap: keywords listed on the Project aren't well-covered by
// title/H1 content across crawled pages.
// ---------------------------------------------------------------------

const semanticGapGen: RecommendationGenerator = (ctx) => {
  if (ctx.project.keywords.length === 0 || ctx.crawl.pages.length === 0) {
    return [];
  }
  const corpus = ctx.crawl.pages
    .map((p) => `${p.title ?? ""} ${p.metaDescription ?? ""}`)
    .join(" ")
    .toLowerCase();
  const missing = ctx.project.keywords.filter(
    (k) => !corpus.includes(k.toLowerCase()),
  );
  if (missing.length === 0) return [];
  return [
    {
      category: "CONTENT",
      kind: "CONTENT_SEMANTIC_GAP",
      targetKey: "project:semantic-gap",
      title: `${missing.length} target keywords missing from page metadata`,
      description: `These tracked keywords don't appear in any crawled page title or description: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}. AI providers infer entity-topic relationships from metadata.`,
      action: "Map each missing keyword to a target page and update the title/description to reflect the topic explicitly.",
      confidence: 0.7,
      impactScore: Math.min(80, 30 + missing.length * 5),
      difficulty: "EASY",
      evidence: { missingKeywords: missing },
    },
  ];
};

// ---------------------------------------------------------------------
// Authority pillar: low overall visibility AND thin long-form content
// (few pages with high word counts) suggests the brand lacks pillar
// content for AI providers to anchor to.
// ---------------------------------------------------------------------

const authorityPillarGen: RecommendationGenerator = (ctx) => {
  const score = ctx.visibility.latestScore;
  if (score === null || score >= 60) return [];
  const longPages = ctx.crawl.pages.filter(
    (p) => (p.wordCount ?? 0) >= 1500,
  ).length;
  if (longPages >= 5) return [];
  return [
    {
      category: "CONTENT",
      kind: "CONTENT_AUTHORITY_PILLAR",
      targetKey: "project:authority-pillar",
      title: "Build authoritative pillar content",
      description: `Visibility score is ${score} with only ${longPages} long-form (>1500w) pages. AI providers favor in-depth content when forming brand-topic associations.`,
      action: "Publish 2-3 pillar pages (2000+ words each) covering your core topics. Use clear H2/H3 structure and cite primary sources.",
      confidence: clamp(ctx.visibility.confidence, 0.4, 0.95),
      impactScore: 75,
      difficulty: "HARD",
      evidence: { score, longPages, totalPages: ctx.crawl.pages.length },
    },
  ];
};

export const contentGenerators: RecommendationGenerator[] = [
  topicClusterGapGen,
  faqOpportunityGen,
  comparisonPageGen,
  semanticGapGen,
  authorityPillarGen,
];

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const prettyCategory = (c: PromptCategory): string =>
  c
    .toLowerCase()
    .split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
