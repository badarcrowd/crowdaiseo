import type {
  GeneratedRecommendation,
  RecommendationGenerator,
} from "../../domain/types";

/**
 * Authority recommendations.
 *
 * Built on citation intelligence + competitor dominance:
 *   - Citation opportunities: high-authority domains AI providers cite
 *     where the brand is absent.
 *   - Community visibility: when Reddit/Quora-class domains are high-
 *     impact citation sources, the brand needs a presence there.
 *   - PR / backlink: when competitor dominance + low citation diversity
 *     suggest the brand isn't part of the conversation.
 */

const REDDIT_AUTHORITY_INFLUENCE_THRESHOLD = 0.1;
const HIGH_AUTHORITY_THRESHOLD = 0.7;

// ---------------------------------------------------------------------
// Citation opportunities — already pre-ranked by the citation engine,
// just translated into actionable text.
// ---------------------------------------------------------------------

const citationOpportunityGen: RecommendationGenerator = (ctx) => {
  return ctx.citations.opportunities.slice(0, 8).map<GeneratedRecommendation>(
    (o) => ({
      category: "AUTHORITY",
      kind: "AUTHORITY_CITATION_OPPORTUNITY",
      targetKey: `citation:${o.domain.toLowerCase()}`,
      title: `Earn a citation on ${o.domain}`,
      description: `AI providers consistently cite ${o.domain} (authority ${o.authority.toFixed(2)}) when answering questions in your space — and your brand isn't being cited there.`,
      action: chooseCitationAction(o.domain, o.authority),
      confidence: o.score,
      impactScore: Math.round(40 + o.score * 50),
      difficulty: o.authority >= 0.85 ? "HARD" : "MEDIUM",
      evidence: {
        domain: o.domain,
        authority: o.authority,
        opportunityScore: o.score,
      },
    }),
  );
};

// ---------------------------------------------------------------------
// Reddit / community visibility — surfaces when Reddit-class domains
// are in the top-cited list and the brand is missing.
// ---------------------------------------------------------------------

const communityVisibilityGen: RecommendationGenerator = (ctx) => {
  const reddit = ctx.citations.opportunities.find((o) =>
    /reddit\.com$/.test(o.domain.toLowerCase()),
  );
  const quora = ctx.citations.opportunities.find((o) =>
    /quora\.com$/.test(o.domain.toLowerCase()),
  );
  const targets = [reddit, quora].filter(
    (t): t is NonNullable<typeof t> =>
      Boolean(t) && (t as { score: number }).score >= REDDIT_AUTHORITY_INFLUENCE_THRESHOLD,
  );
  return targets.map<GeneratedRecommendation>((t) => ({
    category: "AUTHORITY",
    kind: "AUTHORITY_COMMUNITY_VISIBILITY",
    targetKey: `community:${t.domain.toLowerCase()}`,
    title: `Build presence on ${t.domain}`,
    description: `${t.domain} heavily influences AI recommendations in your space. Authentic community participation often shows up faster in AI answers than traditional SEO.`,
    action: `Identify the 3-5 most active subreddits or topic threads relevant to your space. Contribute substantively — answer questions, share data, never spam.`,
    confidence: 0.7,
    impactScore: 60,
    difficulty: "MEDIUM",
    evidence: { domain: t.domain, authority: t.authority },
  }));
};

// ---------------------------------------------------------------------
// PR / backlink opportunities — derived from competitor gaps + missing
// high-authority citations. The system can't guarantee a placement, so
// these stay framed as "outreach targets," not "do this".
// ---------------------------------------------------------------------

const prOpportunityGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  const bigGap = ctx.competitors.biggestGaps[0];
  const highAuthMissing = ctx.citations.topDomainsBrandMissing
    .filter((d) => ctx.citations.opportunities.find((o) => o.domain === d && o.authority >= HIGH_AUTHORITY_THRESHOLD))
    .slice(0, 5);

  if (bigGap && bigGap.delta < -10) {
    out.push({
      category: "AUTHORITY",
      kind: "AUTHORITY_PR_OPPORTUNITY",
      targetKey: `pr:gap-${bigGap.entity.toLowerCase()}`,
      title: `Earn industry mentions to close the gap with ${bigGap.entity}`,
      description: `${bigGap.entity} appeared in ${Math.abs(bigGap.delta)} more AI runs than your brand. Closing this gap typically requires earned mentions in publications AI providers trust.`,
      action: "Run a 60-day PR campaign targeting 5-10 trade publications. Anchor pitches to original data or customer outcomes — opinions don't get cited.",
      confidence: 0.65,
      impactScore: 70,
      difficulty: "HARD",
      evidence: {
        competitor: bigGap.entity,
        gap: bigGap.delta,
        categories: bigGap.dominantCategories,
      },
    });
  }
  if (highAuthMissing.length >= 2) {
    out.push({
      category: "AUTHORITY",
      kind: "AUTHORITY_BACKLINK_OPPORTUNITY",
      targetKey: "backlinks:high-authority-missing",
      title: `Pursue links from ${highAuthMissing.length} high-authority sources`,
      description: `Top AI-trusted sources (${highAuthMissing.slice(0, 3).join(", ")}…) don't link to your domain. Backlinks from these dramatically lift AI provider trust.`,
      action: "Build digital-PR-grade content (original research, definitive guides) that these domains would naturally want to reference.",
      confidence: 0.6,
      impactScore: 75,
      difficulty: "HARD",
      evidence: { targetDomains: highAuthMissing },
    });
  }
  return out;
};

export const authorityGenerators: RecommendationGenerator[] = [
  citationOpportunityGen,
  communityVisibilityGen,
  prOpportunityGen,
];

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const chooseCitationAction = (domain: string, authority: number): string => {
  const d = domain.toLowerCase();
  if (/wikipedia\.org$/.test(d)) {
    return "Identify the relevant Wikipedia article. Contribute well-sourced, neutral edits where your domain can be a legitimate citation.";
  }
  if (/reddit\.com$/.test(d)) {
    return "Participate in 3-5 active subreddits where buying decisions are discussed. Provide substantive answers — Reddit gates promotion hard.";
  }
  if (/github\.com$/.test(d)) {
    return "Open-source a useful adjacent tool. Ensure README links to your domain and includes Organization JSON-LD on the linked landing page.";
  }
  if (/stackoverflow\.com$/.test(d)) {
    return "Identify the top SO questions in your space. Answer them deeply, citing your documentation only when relevant.";
  }
  if (authority >= 0.85) {
    return `Build a tier-1 PR push toward ${domain}. Lead with proprietary data or a customer story; this tier doesn't take pitches without substance.`;
  }
  return `Identify the content path through which ${domain} typically links externally and create matching reference-grade content on your site.`;
};
