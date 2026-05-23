import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { mean, pct } from "../math";

const HIGH_AUTHORITY_THRESHOLD = 0.7;
const CONCENTRATION_THRESHOLD = 0.3; // HHI above this = dangerously concentrated

/**
 * Brand Trust Generator.
 *
 * Measures the quality of the brand's citation footprint:
 *   - Citation authority trend (are high-DA sources citing more?)
 *   - Concentration risk (Herfindahl-Hirschman Index)
 *   - High-authority domain coverage
 *   - Trust trajectory over 30 days
 *
 * Emits: BRAND_TRUST_SIGNAL (positive or negative)
 */
export const generateBrandTrust = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.citationMetrics.length === 0) return [];

  const out: ExecutiveInsight[] = [];

  const todayDate = new Date(ctx.todayIso);
  const last7Start = isoDay(addDays(todayDate, -7));
  const prior7Start = isoDay(addDays(todayDate, -14));

  const last7 = ctx.citationMetrics.filter((m) => m.day >= last7Start);
  const prior7 = ctx.citationMetrics.filter(
    (m) => m.day >= prior7Start && m.day < last7Start,
  );

  // ----- Authority trend -----
  const authorityInsight = analyzeAuthorityTrend(last7, prior7, ctx.todayIso);
  if (authorityInsight) out.push(authorityInsight);

  // ----- Concentration risk -----
  const concentrationInsight = analyzeConcentration(last7, ctx.todayIso);
  if (concentrationInsight) out.push(concentrationInsight);

  // ----- High-authority domain coverage -----
  const coverageInsight = analyzeHighAuthorityGap(last7, ctx.todayIso);
  if (coverageInsight) out.push(coverageInsight);

  return out;
};

// -------------------------------------------------------------------------
// Authority trend
// -------------------------------------------------------------------------

type CitationRow = { day: string; domain: string; count: number; authorityScore: number; byProvider: Record<string, number>; avgRank: number | null };

function analyzeAuthorityTrend(
  last7: CitationRow[],
  prior7: CitationRow[],
  todayIso: string,
): ExecutiveInsight | null {
  if (last7.length === 0) return null;

  const recentAuthAvg = mean(last7.map((c) => c.authorityScore));
  const priorAuthAvg = prior7.length
    ? mean(prior7.map((c) => c.authorityScore))
    : null;

  const authDeltaPct =
    priorAuthAvg !== null && priorAuthAvg > 0
      ? ((recentAuthAvg - priorAuthAvg) / priorAuthAvg) * 100
      : null;

  if (authDeltaPct === null || Math.abs(authDeltaPct) < 5) return null;

  const improving = authDeltaPct > 0;
  const uniqueDomains = new Set(last7.map((c) => c.domain)).size;
  const highAuthDomains = last7.filter(
    (c) => c.authorityScore >= HIGH_AUTHORITY_THRESHOLD,
  );
  const highAuthUnique = new Set(highAuthDomains.map((c) => c.domain)).size;

  const severity = improving || authDeltaPct >= -15 ? "INFO" : "ATTENTION";
  const domainSuffix = highAuthUnique === 1 ? "" : "s";
  const bodyImproving = `The average authority score of domains citing your brand improved ${pct(authDeltaPct)} vs last week (${recentAuthAvg.toFixed(2)} vs ${priorAuthAvg?.toFixed(2)}). ${highAuthUnique} high-authority domain${domainSuffix} cited you this week. This is a strong positive trust signal for AI models.`;
  const bodyDeclining = `The average authority score of domains citing your brand declined ${pct(Math.abs(authDeltaPct))} vs last week (${recentAuthAvg.toFixed(2)} vs ${priorAuthAvg?.toFixed(2)}). Lower-authority sources are dominating your citation profile, which reduces AI model confidence in your brand.`;
  const priorWeekItems = priorAuthAvg === null
    ? []
    : [{ label: "Prior week", value: priorAuthAvg.toFixed(2), delta: authDeltaPct }];

  return {
    kind: "BRAND_TRUST_SIGNAL",
    severity,
    title: improving
      ? `Citation authority improving — up ${pct(authDeltaPct)} this week`
      : `Citation authority declining — down ${pct(authDeltaPct)} this week`,
    body: improving ? bodyImproving : bodyDeclining,
    confidence: Math.min(0.88, 0.5 + last7.length * 0.03),
    forDay: todayIso,
    metadata: {
      evidence: {
        items: [
          {
            label: "Avg authority this week",
            value: recentAuthAvg.toFixed(2),
            highlight: true,
          },
          ...priorWeekItems,
          { label: "Unique citation domains", value: uniqueDomains },
          { label: "High-authority domains (≥0.7)", value: highAuthUnique },
        ],
        windowDays: 7,
        dataPoints: last7.length,
        comparedTo: "prior_7d",
      },
      authDeltaPct,
      recentAuthAvg,
      priorAuthAvg,
      uniqueDomains,
      highAuthUnique,
      recommendedAction: improving
        ? "Double down on the types of content being cited by high-authority sources."
        : "Pursue coverage from high-authority publications and industry references in your niche.",
    },
  };
}

// -------------------------------------------------------------------------
// Concentration risk (HHI)
// -------------------------------------------------------------------------

function analyzeConcentration(
  last7: { domain: string; count: number }[],
  todayIso: string,
): ExecutiveInsight | null {
  if (last7.length < 3) return null;

  const totalCitations = last7.reduce((s, c) => s + c.count, 0);
  if (totalCitations === 0) return null;

  // Aggregate by domain
  const domainCounts: Record<string, number> = {};
  for (const row of last7) {
    domainCounts[row.domain] = (domainCounts[row.domain] ?? 0) + row.count;
  }

  const shares = Object.values(domainCounts).map((c) => c / totalCitations);
  const hhi = shares.reduce((s, p) => s + p * p, 0); // 0..1, lower = more diverse

  if (hhi < CONCENTRATION_THRESHOLD) return null; // Healthy diversity

  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];
  const topShare = topDomain[1] / totalCitations;

  return {
    kind: "BRAND_TRUST_SIGNAL",
    severity: hhi > 0.5 ? "ATTENTION" : "INFO",
    title: `Citation profile is concentrated — ${pct(topShare * 100)} from one source`,
    body: `${pct(topShare * 100)} of AI citations pointing to your brand come from a single domain (${topDomain[0]}). Concentration index: ${hhi.toFixed(2)} (0=diverse, 1=monopoly). Single-source dependence is a trust risk — if that source is removed or deprioritized, your visibility could drop sharply.`,
    confidence: 0.75,
    forDay: todayIso,
    metadata: {
      evidence: {
        items: [
          {
            label: "Concentration index (HHI)",
            value: hhi.toFixed(2),
            highlight: true,
          },
          { label: "Top domain", value: topDomain[0] },
          { label: "Top domain share", value: pct(topShare * 100) },
          { label: "Total citations", value: totalCitations },
        ],
        windowDays: 7,
        dataPoints: last7.length,
      },
      hhi,
      topDomain: topDomain[0],
      topShare,
      totalDomains: Object.keys(domainCounts).length,
      recommendedAction: `Diversify your citation sources by earning mentions on other authoritative sites beyond ${topDomain[0]}.`,
    },
  };
}

// -------------------------------------------------------------------------
// High-authority domain gap
// -------------------------------------------------------------------------

function analyzeHighAuthorityGap(
  last7: { domain: string; authorityScore: number; count: number }[],
  todayIso: string,
): ExecutiveInsight | null {
  if (last7.length === 0) return null;

  const highAuthDomains = last7.filter(
    (c) => c.authorityScore >= HIGH_AUTHORITY_THRESHOLD,
  );
  const uniqueHigh = new Set(highAuthDomains.map((c) => c.domain)).size;
  const uniqueAll = new Set(last7.map((c) => c.domain)).size;

  if (uniqueAll === 0) return null;

  const highAuthRate = uniqueHigh / uniqueAll;
  if (highAuthRate >= 0.3 || uniqueAll < 4) return null; // Not a gap

  return {
    kind: "BRAND_TRUST_SIGNAL",
    severity: uniqueHigh === 0 ? "ATTENTION" : "INFO",
    title: `Low high-authority citation coverage — ${uniqueHigh} of ${uniqueAll} domains`,
    body: `Only ${uniqueHigh} of ${uniqueAll} unique citation domains have high authority (≥0.7). This suggests AI models are learning about your brand primarily from lower-authority sources. High-authority coverage correlates strongly with recommendation frequency.`,
    confidence: Math.min(0.85, 0.5 + uniqueAll * 0.03),
    forDay: todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "High-authority domains", value: uniqueHigh, highlight: true },
          { label: "Total citation domains", value: uniqueAll },
          { label: "High-authority rate", value: pct(highAuthRate * 100) },
        ],
        windowDays: 7,
        dataPoints: last7.length,
      },
      highAuthRate,
      uniqueHighAuthDomains: uniqueHigh,
      uniqueTotalDomains: uniqueAll,
      recommendedAction: "Target coverage in high-authority publications: industry associations, major trade publications, academic references.",
    },
  };
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
