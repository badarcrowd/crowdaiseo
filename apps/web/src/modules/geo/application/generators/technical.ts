import type {
  GeneratedRecommendation,
  RecommendationGenerator,
} from "../../domain/types";

/**
 * Technical recommendations.
 *
 * Powered by aggregated crawl issues + schema/structure signals
 * extracted by the crawler. The crawler already emits granular
 * per-page issues; this layer rolls them up into project-wide actions
 * with explicit impact estimates.
 */

// Pages with any missing meta description count toward this threshold.
const METADATA_GAP_PCT = 0.2;
const SCHEMA_COVERAGE_THRESHOLD = 0.3;

// ---------------------------------------------------------------------
// Schema improvements: aggregate coverage of Organization, Article,
// Breadcrumb, and FAQ schemas. AI providers preferentially cite
// structured-data-rich content.
// ---------------------------------------------------------------------

const schemaImprovementGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  const total = ctx.crawl.pages.length;
  if (total === 0) return out;

  const org = ctx.crawl.pages.filter((p) => p.hasOrgSchema).length;
  const article = ctx.crawl.pages.filter((p) => p.hasArticleSchema).length;
  const breadcrumb = ctx.crawl.pages.filter((p) => p.hasBreadcrumbSchema).length;

  if (org / total < 0.5) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_MISSING_SCHEMA",
      targetKey: "schema:organization",
      title: "Add Organization schema sitewide",
      description: `Only ${org} of ${total} crawled pages declare Organization schema. AI providers use Organization JSON-LD to disambiguate your brand from similarly-named entities.`,
      action: "Add a single Organization JSON-LD block to your site's <head>. Include name, url, logo, sameAs (social profiles), and contactPoint.",
      confidence: 0.9,
      impactScore: 70,
      difficulty: "EASY",
      evidence: { pagesWithOrgSchema: org, totalPages: total },
    });
  }

  if (article / Math.max(1, total) < SCHEMA_COVERAGE_THRESHOLD) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_MISSING_SCHEMA",
      targetKey: "schema:article",
      title: "Mark up editorial content with Article schema",
      description: `${article} of ${total} pages use Article schema. Without it, AI providers miss authorship and publish-date signals.`,
      action: "Add Article (or BlogPosting) JSON-LD to all editorial pages. Include author, datePublished, and image.",
      confidence: 0.8,
      impactScore: 55,
      difficulty: "MEDIUM",
      evidence: { pagesWithArticleSchema: article, totalPages: total },
    });
  }

  if (breadcrumb / Math.max(1, total) < SCHEMA_COVERAGE_THRESHOLD) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_MISSING_SCHEMA",
      targetKey: "schema:breadcrumb",
      title: "Add BreadcrumbList schema",
      description: `${breadcrumb} of ${total} pages declare BreadcrumbList. Breadcrumbs help AI providers understand site hierarchy.`,
      action: "Add BreadcrumbList JSON-LD reflecting your category > sub-category > page structure.",
      confidence: 0.75,
      impactScore: 35,
      difficulty: "EASY",
      evidence: { pagesWithBreadcrumb: breadcrumb, totalPages: total },
    });
  }

  return out;
};

// ---------------------------------------------------------------------
// Metadata gaps: missing/short titles + descriptions per the existing
// crawler issue codes.
// ---------------------------------------------------------------------

const metadataGapGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  const total = ctx.crawl.pages.length;
  if (total === 0) return out;

  const missingTitle = ctx.crawl.issueCounts.get("missing-title")?.count ?? 0;
  const missingDesc =
    ctx.crawl.issueCounts.get("missing-meta-description")?.count ?? 0;
  const titlePct = missingTitle / total;
  const descPct = missingDesc / total;

  if (titlePct >= METADATA_GAP_PCT) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_METADATA_GAP",
      targetKey: "metadata:missing-title",
      title: `${missingTitle} pages missing a <title>`,
      description: `${Math.round(titlePct * 100)}% of crawled pages have no title. Pages with empty titles are essentially invisible to AI providers when forming entity-page associations.`,
      action: "Write descriptive 50-60 character titles for every page. Lead with the most specific term.",
      confidence: 1.0,
      impactScore: Math.min(85, 50 + titlePct * 100),
      difficulty: "EASY",
      evidence: { missingTitle, totalPages: total },
    });
  }

  if (descPct >= METADATA_GAP_PCT) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_METADATA_GAP",
      targetKey: "metadata:missing-description",
      title: `${missingDesc} pages missing a meta description`,
      description: `${Math.round(descPct * 100)}% of pages have no meta description. AI providers frequently use descriptions verbatim when summarizing brands.`,
      action: "Write 120-160 character descriptions per page. Focus on a clear value statement + one entity-specific keyword.",
      confidence: 1.0,
      impactScore: Math.min(75, 40 + descPct * 100),
      difficulty: "EASY",
      evidence: { missingDescription: missingDesc, totalPages: total },
    });
  }

  return out;
};

// ---------------------------------------------------------------------
// Crawlability: robots/sitemap presence + 4xx/5xx counts.
// ---------------------------------------------------------------------

const crawlabilityGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  if (!ctx.crawl.hasSitemap) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_CRAWLABILITY_ISSUE",
      targetKey: "crawl:no-sitemap",
      title: "Publish an XML sitemap",
      description: "No sitemap.xml was discovered. AI crawlers use sitemaps to find canonical URLs.",
      action: "Generate sitemap.xml, reference it from robots.txt, and submit it to search consoles.",
      confidence: 1.0,
      impactScore: 60,
      difficulty: "EASY",
      evidence: { hasSitemap: false },
    });
  }
  if (!ctx.crawl.hasRobotsTxt) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_CRAWLABILITY_ISSUE",
      targetKey: "crawl:no-robots",
      title: "Add a robots.txt",
      description: "No robots.txt was found. Without it, some AI crawlers fall back to conservative defaults that may skip pages.",
      action: "Publish robots.txt with an explicit Sitemap directive and allow rules for your canonical content paths.",
      confidence: 1.0,
      impactScore: 35,
      difficulty: "EASY",
      evidence: { hasRobotsTxt: false },
    });
  }

  const errors = (ctx.crawl.issueCounts.get("http-5xx")?.count ?? 0) +
    (ctx.crawl.issueCounts.get("http-404")?.count ?? 0);
  if (errors > 0) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_CRAWLABILITY_ISSUE",
      targetKey: "crawl:http-errors",
      title: `${errors} pages returning HTTP errors`,
      description: `${errors} crawled URLs returned 404/5xx. AI crawlers de-prioritize unreliable origins.`,
      action: "Audit broken URLs. Restore content where appropriate; otherwise issue 301 redirects to relevant live pages.",
      confidence: 1.0,
      impactScore: Math.min(70, 30 + errors),
      difficulty: "MEDIUM",
      evidence: { httpErrorCount: errors },
    });
  }
  return out;
};

// ---------------------------------------------------------------------
// Page structure: pages with no H1 or with thin content.
// ---------------------------------------------------------------------

const pageStructureGen: RecommendationGenerator = (ctx) => {
  const out: GeneratedRecommendation[] = [];
  const total = ctx.crawl.pages.length;
  if (total === 0) return out;
  const noH1 = ctx.crawl.pages.filter((p) => p.h1Count === 0).length;
  const thin = ctx.crawl.pages.filter((p) => (p.wordCount ?? 0) < 200).length;
  if (noH1 / total >= 0.15) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_PAGE_STRUCTURE_ISSUE",
      targetKey: "structure:no-h1",
      title: `${noH1} pages have no H1`,
      description: `${Math.round((noH1 / total) * 100)}% of pages have no H1. AI providers rely on H1 to anchor the page's primary topic.`,
      action: "Add exactly one descriptive H1 per page, distinct from the <title>.",
      confidence: 0.95,
      impactScore: 45,
      difficulty: "EASY",
      evidence: { pagesWithoutH1: noH1, totalPages: total },
    });
  }
  if (thin / total >= 0.25) {
    out.push({
      category: "TECHNICAL",
      kind: "TECH_PAGE_STRUCTURE_ISSUE",
      targetKey: "structure:thin-content",
      title: `${thin} pages have thin content (<200 words)`,
      description: `${Math.round((thin / total) * 100)}% of pages have under 200 words. AI providers typically need richer context to confidently cite a source.`,
      action: "Expand thin pages with substantive answers, examples, and internal links. Consider consolidating low-value pages.",
      confidence: 0.8,
      impactScore: 50,
      difficulty: "MEDIUM",
      evidence: { thinPageCount: thin, totalPages: total },
    });
  }
  return out;
};

export const technicalGenerators: RecommendationGenerator[] = [
  schemaImprovementGen,
  metadataGapGen,
  crawlabilityGen,
  pageStructureGen,
];
