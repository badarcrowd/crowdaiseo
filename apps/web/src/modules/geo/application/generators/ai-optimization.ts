import type { ProviderId } from "@prisma/client";
import type {
  GeneratedRecommendation,
  RecommendationGenerator,
} from "../../domain/types";

/**
 * AI optimization recommendations.
 *
 * Direct-to-AI levers: prompt alignment, entity strengthening, trust
 * signals, and E-E-A-T (Experience, Expertise, Authoritativeness,
 * Trust) reinforcement.
 *
 * These differ from technical recommendations in that the user is not
 * fixing a broken thing — they're tuning the brand's machine-readable
 * personality so AI providers pick it up consistently.
 */

const PROVIDER_DROUGHT_THRESHOLD = 35;
const NEGATIVE_SENTIMENT_THRESHOLD = 0.25;

// ---------------------------------------------------------------------
// Prompt alignment — surface prompts where the brand is conspicuously
// absent. These are the things buyers ask AI; if you're not in the
// answer, the brand has a positioning problem on that intent.
// ---------------------------------------------------------------------

const promptAlignmentGen: RecommendationGenerator = (ctx) => {
  if (ctx.visibility.weakPrompts.length === 0) return [];
  const limit = Math.min(5, ctx.visibility.weakPrompts.length);
  return ctx.visibility.weakPrompts.slice(0, limit).map<GeneratedRecommendation>(
    (p) => ({
      category: "AI_OPTIMIZATION",
      kind: "AI_PROMPT_ALIGNMENT",
      targetKey: `prompt:${p.promptId}`,
      title: `Align content with "${p.name}"`,
      description: `Brand mention rate for this prompt is ${Math.round(p.mentionRate * 100)}%. AI providers aren't finding a strong association between your brand and the underlying query.`,
      action: `Publish one definitive answer page targeted to this query. Use the exact phrasing buyers use, anchor it with FAQ schema, and link from a high-authority internal page.`,
      confidence: 0.7,
      impactScore: Math.round(40 + (1 - p.mentionRate) * 40),
      difficulty: "MEDIUM",
      evidence: {
        promptId: p.promptId,
        promptName: p.name,
        mentionRate: p.mentionRate,
        category: p.category,
      },
    }),
  );
};

// ---------------------------------------------------------------------
// Entity strengthening — flagged when sitewide Organization schema is
// thin OR Wikipedia/knowledge-graph signals are missing. Without a
// strong entity, AI providers may conflate the brand with similarly-
// named companies.
// ---------------------------------------------------------------------

const entityStrengtheningGen: RecommendationGenerator = (ctx) => {
  const total = ctx.crawl.pages.length;
  if (total === 0) return [];
  const orgCoverage =
    ctx.crawl.pages.filter((p) => p.hasOrgSchema).length / total;
  if (orgCoverage >= 0.7) return [];
  return [
    {
      category: "AI_OPTIMIZATION",
      kind: "AI_ENTITY_STRENGTHENING",
      targetKey: "entity:brand-disambiguation",
      title: "Strengthen brand entity signals for AI providers",
      description: `Organization schema coverage is ${Math.round(orgCoverage * 100)}%. Combined with no/low Wikipedia/Wikidata presence, this leaves AI providers without a canonical "this is who you are" anchor.`,
      action: "Publish a sitewide Organization JSON-LD with sameAs links to LinkedIn, Crunchbase, X, and (if eligible) a Wikipedia page. Cross-link from PR mentions.",
      confidence: 0.85,
      impactScore: 70,
      difficulty: "MEDIUM",
      evidence: { orgSchemaCoverage: orgCoverage, totalPages: total },
    },
  ];
};

// ---------------------------------------------------------------------
// Trust signals — surfaced when sentiment skews negative OR when a
// single provider is particularly low and the others are healthy
// (suggests provider-specific trust issue).
// ---------------------------------------------------------------------

const trustSignalGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];

  if (ctx.sentiment.negativeShare >= NEGATIVE_SENTIMENT_THRESHOLD) {
    out.push({
      category: "AI_OPTIMIZATION",
      kind: "AI_TRUST_SIGNAL",
      targetKey: "trust:negative-sentiment",
      title: "Counter negative AI sentiment with proof",
      description: `${Math.round(ctx.sentiment.negativeShare * 100)}% of brand mentions skew negative. AI providers reflect what they read — sustained negative coverage compounds.`,
      action: "Publish case studies, testimonials, and customer outcome data with structured Review/Rating markup. Address known criticisms head-on in dedicated content.",
      confidence: 0.7,
      impactScore: 65,
      difficulty: "MEDIUM",
      evidence: {
        avgSentiment: ctx.sentiment.avgScore,
        negativeShare: ctx.sentiment.negativeShare,
      },
    });
  }

  // Per-provider trust gap — one provider materially lower than others.
  const providerScores = Object.entries(ctx.visibility.byProvider) as Array<[
    ProviderId,
    number,
  ]>;
  if (providerScores.length >= 2) {
    const mean = providerScores.reduce((s, [, v]) => s + v, 0) / providerScores.length;
    for (const [provider, value] of providerScores) {
      if (value < PROVIDER_DROUGHT_THRESHOLD && mean - value >= 20) {
        out.push({
          category: "AI_OPTIMIZATION",
          kind: "AI_TRUST_SIGNAL",
          targetKey: `trust:provider-${provider}`,
          title: `Trust gap on ${provider}`,
          description: `Your score on ${provider} (${value}) is materially below the average (${Math.round(mean)}). Each provider weights sources differently — this often signals a missing presence on sources that provider preferentially trusts.`,
          action: `Audit the citation sources ${provider} typically uses for your space. Prioritize gaining presence on the top 3.`,
          confidence: 0.65,
          impactScore: 55,
          difficulty: "MEDIUM",
          evidence: { provider, score: value, peerMean: Math.round(mean) },
        });
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------
// E-E-A-T — Experience, Expertise, Authoritativeness, Trust. The
// heuristics are necessarily blunt: we surface this when there's no
// author markup, no organization markup, and weak long-form coverage.
// ---------------------------------------------------------------------

const eeAtGen: RecommendationGenerator = (ctx) => {
  const total = ctx.crawl.pages.length;
  if (total === 0) return [];
  const articleSchemaCoverage =
    ctx.crawl.pages.filter((p) => p.hasArticleSchema).length / total;
  const longPages = ctx.crawl.pages.filter(
    (p) => (p.wordCount ?? 0) >= 1000,
  ).length;
  if (articleSchemaCoverage >= 0.4 && longPages >= 10) return [];
  return [
    {
      category: "AI_OPTIMIZATION",
      kind: "AI_EEAT_IMPROVEMENT",
      targetKey: "eeat:author-expertise",
      title: "Reinforce E-E-A-T signals",
      description: `Only ${Math.round(articleSchemaCoverage * 100)}% of pages declare author/Article schema and ${longPages} are long-form. AI providers (especially Perplexity, Google) lean heavily on E-E-A-T signals when choosing what to cite.`,
      action: "Add author bylines with structured Person schema (job title, credentials, sameAs to LinkedIn). Cite primary sources inline. Surface author bios on a dedicated /authors directory.",
      confidence: 0.75,
      impactScore: 60,
      difficulty: "MEDIUM",
      evidence: {
        articleSchemaCoverage,
        longPages,
        totalPages: total,
      },
    },
  ];
};

export const aiOptimizationGenerators: RecommendationGenerator[] = [
  promptAlignmentGen,
  entityStrengtheningGen,
  trustSignalGen,
  eeAtGen,
];
