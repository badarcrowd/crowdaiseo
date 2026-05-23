import type { ProviderId } from "@prisma/client";
import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { groupBy, mean, pct } from "../math";

/**
 * Provider-Specific Recommendation Generator.
 *
 * Each major AI provider has different citation preferences and
 * ranking signals. This generator analyzes the citation byProvider
 * data to derive provider-specific actions:
 *
 *   OPENAI (ChatGPT): Prefers high-authority, editorial sources.
 *     Structured data, authoritative backlinks, .edu/.gov citations.
 *   ANTHROPIC (Claude): Prefers long-form, nuanced content.
 *     Comprehensive guides, academic-style references.
 *   GOOGLE (Gemini): Closely mirrors Google Search signals.
 *     Technical SEO, Core Web Vitals, Google-indexed content.
 *   PERPLEXITY: Surfaces community/forum sources heavily.
 *     Reddit, Quora, Stack Exchange, industry Slack communities.
 *
 * Emits: PROVIDER_RECOMMENDATION (one per provider, evidence-backed)
 */

const PROVIDER_PROFILES: Record<
  string,
  {
    label: string;
    favors: string[];
    citationSignals: Array<{ pattern: RegExp; label: string }>;
    action: string;
    context: string;
  }
> = {
  OPENAI: {
    label: "ChatGPT",
    favors: ["editorial", "authoritative", ".edu", ".gov"],
    citationSignals: [
      { pattern: /\.edu$/i, label: "Educational domain (.edu)" },
      { pattern: /\.gov$/i, label: "Government domain (.gov)" },
      { pattern: /wikipedia\.org$/i, label: "Wikipedia" },
      { pattern: /reuters\.com|apnews\.com|bbc\.com$/i, label: "Major news outlet" },
    ],
    action: "Earn citations from authoritative editorial sources — industry associations, major publications, and .edu/.gov domains. ChatGPT weights these heavily.",
    context: "ChatGPT strongly prefers sources with established editorial authority. Structured, factual content with clear authorship signals performs best.",
  },
  ANTHROPIC: {
    label: "Claude",
    favors: ["long-form", "nuanced", "academic"],
    citationSignals: [
      { pattern: /arxiv\.org|scholar\.google|pubmed/i, label: "Academic source" },
      { pattern: /\.pdf$/i, label: "PDF document" },
      { pattern: /substack\.com|medium\.com/i, label: "Long-form publication" },
    ],
    action: "Create comprehensive, long-form content with nuanced reasoning. Claude rewards depth and accuracy over brevity. Include citations to academic or expert sources within your own content.",
    context: "Claude values comprehensive, well-reasoned content. It tends to cite sources that provide thorough explanations rather than quick summaries.",
  },
  GOOGLE: {
    label: "Gemini",
    favors: ["Google-indexed", "Core Web Vitals", "structured data"],
    citationSignals: [
      { pattern: /google\.|youtube\.com/i, label: "Google property" },
      { pattern: /schema\.org/i, label: "Structured data" },
    ],
    action: "Treat Gemini visibility as an extension of Google Search SEO. Optimize Core Web Vitals, implement structured data (Schema.org), and ensure your content is properly indexed in Google Search Console.",
    context: "Gemini draws heavily from Google's search index. Traditional SEO signals — crawlability, page speed, structured markup, and Google Business Profile — directly influence Gemini citations.",
  },
  PERPLEXITY: {
    label: "Perplexity",
    favors: ["community", "forums", "real-time"],
    citationSignals: [
      { pattern: /reddit\.com/i, label: "Reddit" },
      { pattern: /quora\.com/i, label: "Quora" },
      { pattern: /stackoverflow\.com|stackexchange\.com/i, label: "Stack Exchange" },
      { pattern: /ycombinator\.com/i, label: "Hacker News" },
    ],
    action: "Build community presence on Reddit, Quora, and industry forums. Perplexity heavily cites community-generated content. Authentic brand advocates in these channels translate directly to Perplexity citations.",
    context: "Perplexity is uniquely influenced by community platforms and forums. It surfaces Reddit threads, Quora answers, and discussion boards more than any other provider.",
  },
};

export const generateProviderRecommendations = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.latestRuns.length === 0 && ctx.citationMetrics.length === 0)
    return [];

  const out: ExecutiveInsight[] = [];

  const todayDate = new Date(ctx.todayIso);
  const last7Start = isoDay(addDays(todayDate, -7));
  const recentCitations = ctx.citationMetrics.filter((m) => m.day >= last7Start);

  // Build per-provider citation profile
  const citationsByProvider: Record<string, Array<{ domain: string; count: number; auth: number }>> = {};

  for (const row of recentCitations) {
    for (const [provider, count] of Object.entries(row.byProvider)) {
      const c = count as number;
      if (c === 0) continue;
      citationsByProvider[provider] ??= [];
      citationsByProvider[provider].push({
        domain: row.domain,
        count: c,
        auth: row.authorityScore,
      });
    }
  }

  // Per-provider analysis
  const runsPerProvider = groupBy(ctx.latestRuns, (r) => r.provider);

  for (const [providerId, profile] of Object.entries(PROVIDER_PROFILES)) {
    const provRuns = runsPerProvider[providerId] ?? [];
    const provCitations = citationsByProvider[providerId] ?? [];

    if (provRuns.length === 0 && provCitations.length === 0) continue;

    const mentionRate = provRuns.length
      ? provRuns.filter((r) => r.brandMentioned).length / provRuns.length
      : null;

    // Detect which of this provider's preferred signals are present
    const detectedSignals: string[] = [];
    const missingSignals: string[] = [];
    for (const signal of profile.citationSignals) {
      const found = provCitations.some((c) => signal.pattern.test(c.domain));
      if (found) {
        detectedSignals.push(signal.label);
      } else {
        missingSignals.push(signal.label);
      }
    }

    const avgProviderAuth = provCitations.length
      ? mean(provCitations.map((c) => c.auth))
      : null;

    const totalProviderCitations = provCitations.reduce((s, c) => s + c.count, 0);
    const topCitationDomain = provCitations.sort((a, b) => b.count - a.count)[0]?.domain;

    const hasGap = missingSignals.length > detectedSignals.length;
    const evidenceItems = [
      ...(mentionRate !== null
        ? [{ label: "Mention rate", value: pct(mentionRate * 100), highlight: true }]
        : []),
      ...(avgProviderAuth !== null
        ? [{ label: "Avg citation authority", value: avgProviderAuth.toFixed(2) }]
        : []),
      { label: "Citation count (7d)", value: totalProviderCitations },
      ...(topCitationDomain
        ? [{ label: "Top citation source", value: topCitationDomain }]
        : []),
      ...missingSignals.map((s) => ({ label: `Missing: ${s}`, value: "not detected" })),
    ];

    // Only emit if there's a meaningful gap or notable pattern
    if (mentionRate !== null && mentionRate < 0.4 && hasGap) {
      out.push({
        kind: "PROVIDER_RECOMMENDATION",
        severity: mentionRate < 0.15 ? "ATTENTION" : "INFO",
        title: `${profile.label}: low visibility — missing ${profile.label}-specific signals`,
        body: `${profile.label} mention rate is ${pct(mentionRate * 100)}. ${profile.context} Missing signals detected: ${missingSignals.join(", ") || "none"}. Recommended action: ${profile.action}`,
        confidence: Math.min(0.88, 0.5 + (provRuns.length + provCitations.length) * 0.02),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: evidenceItems,
            windowDays: 7,
            dataPoints: provRuns.length + provCitations.length,
          },
          provider: providerId,
          affectedProviders: [providerId as ProviderId],
          mentionRate,
          detectedSignals,
          missingSignals,
          recommendedAction: profile.action,
          providerFavors: profile.favors,
        },
      });
    } else if (mentionRate !== null && mentionRate >= 0.4 && detectedSignals.length > 0) {
      // Positive — explain what's working
      out.push({
        kind: "PROVIDER_RECOMMENDATION",
        severity: "INFO",
        title: `${profile.label}: strong signals detected — ${detectedSignals.join(", ")}`,
        body: `${profile.label} mention rate is ${pct(mentionRate * 100)} and you have the right citation signals in place (${detectedSignals.join(", ")}). ${profile.context} Continue building on these strengths.`,
        confidence: Math.min(0.85, 0.5 + provRuns.length * 0.03),
        forDay: ctx.todayIso,
        metadata: {
          evidence: {
            items: evidenceItems,
            windowDays: 7,
            dataPoints: provRuns.length + provCitations.length,
          },
          provider: providerId,
          affectedProviders: [providerId as ProviderId],
          mentionRate,
          detectedSignals,
          missingSignals,
          recommendedAction: profile.action,
          providerFavors: profile.favors,
          positive: true,
        },
      });
    }
  }

  return out;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
