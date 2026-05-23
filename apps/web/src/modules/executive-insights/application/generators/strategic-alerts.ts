import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { mean, pct, linregSlope, summarizeSeries } from "../math";

/**
 * Strategic Alert Generator.
 *
 * Fires CRITICAL or high-ATTENTION signals for cross-cutting issues
 * that need immediate executive attention:
 *
 * 1. Multi-provider simultaneous drop (>15% on 3+ providers in 7d).
 * 2. Brand disappearance from AI responses (mention rate near zero).
 * 3. Score freefall — multiple consecutive days of decline with anomaly z.
 * 4. Competitor displacement — competitor newly holds top position in categories
 *    your brand previously dominated.
 * 5. Citation collapse — sudden drop in total citations.
 */
export const generateStrategicAlerts = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.snapshots.length === 0) return [];

  const out: ExecutiveInsight[] = [];

  const multiProviderDrop = detectMultiProviderDrop(ctx);
  if (multiProviderDrop) out.push(multiProviderDrop);

  const disappearance = detectBrandDisappearance(ctx);
  if (disappearance) out.push(disappearance);

  const freefall = detectScoreFreefall(ctx);
  if (freefall) out.push(freefall);

  const displacement = detectCompetitorDisplacement(ctx);
  if (displacement) out.push(displacement);

  const citationCollapse = detectCitationCollapse(ctx);
  if (citationCollapse) out.push(citationCollapse);

  return out;
};

// -------------------------------------------------------------------------

function detectMultiProviderDrop(ctx: ExecutiveContext): ExecutiveInsight | null {
  const todayDate = new Date(ctx.todayIso);
  const last7Start = isoDay(addDays(todayDate, -7));
  const prior7Start = isoDay(addDays(todayDate, -14));

  const last7 = ctx.snapshots.filter((s) => s.day >= last7Start);
  const prior7 = ctx.snapshots.filter(
    (s) => s.day >= prior7Start && s.day < last7Start,
  );

  if (last7.length === 0 || prior7.length === 0) return null;

  // Per-provider comparison
  const providers = new Set([
    ...last7.flatMap((s) => Object.keys(s.byProvider)),
    ...prior7.flatMap((s) => Object.keys(s.byProvider)),
  ]);

  const droppedProviders: Array<{ provider: string; delta: number }> = [];

  for (const provider of providers) {
    const recentScores = last7
      .map((s) => s.byProvider[provider])
      .filter((v): v is number => v !== undefined);
    const priorScores = prior7
      .map((s) => s.byProvider[provider])
      .filter((v): v is number => v !== undefined);

    if (recentScores.length === 0 || priorScores.length === 0) continue;

    const recentMean = mean(recentScores);
    const priorMean = mean(priorScores);
    if (priorMean === 0) continue;

    const delta = ((recentMean - priorMean) / priorMean) * 100;
    if (delta <= -15) {
      droppedProviders.push({ provider, delta });
    }
  }

  if (droppedProviders.length < 3) return null;

  const avgDrop = mean(droppedProviders.map((d) => d.delta));
  const providerList = droppedProviders.map((d) => PROVIDER_LABEL[d.provider] ?? d.provider).join(", ");

  return {
    kind: "STRATEGIC_ALERT",
    severity: "CRITICAL",
    title: `Multi-provider visibility collapse — ${droppedProviders.length} providers down >15%`,
    body: `A simultaneous drop was detected across ${droppedProviders.length} AI providers in the past 7 days. Affected providers: ${providerList}. Average decline: ${pct(Math.abs(avgDrop))}. Cross-provider simultaneous drops usually indicate a content issue, domain change, or algorithmic model update — not a provider-specific problem. Investigate immediately.`,
    confidence: Math.min(0.95, 0.6 + droppedProviders.length * 0.1),
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Providers affected", value: droppedProviders.length, highlight: true },
          { label: "Avg drop", value: pct(Math.abs(avgDrop)), delta: avgDrop },
          ...droppedProviders.map((d) => ({
            label: PROVIDER_LABEL[d.provider] ?? d.provider,
            value: `${pct(Math.abs(d.delta))} drop`,
            delta: d.delta,
          })),
        ],
        windowDays: 7,
        dataPoints: last7.length + prior7.length,
        comparedTo: "prior_7d",
      },
      affectedProviders: droppedProviders.map((d) => d.provider),
      droppedProviders,
      avgDrop,
      recommendedAction: "Check for domain migration issues, content removals, or technical SEO regressions. Compare this timing with any site changes in the past 2 weeks.",
    },
  };
}

function detectBrandDisappearance(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.latestRuns.length === 0) return null;

  const mentionRate =
    ctx.latestRuns.filter((r) => r.brandMentioned).length / ctx.latestRuns.length;

  // Only alert if mentions are critically low
  if (mentionRate >= 0.1) return null;

  const totalRuns = ctx.latestRuns.length;
  const mentionedCount = ctx.latestRuns.filter((r) => r.brandMentioned).length;

  return {
    kind: "STRATEGIC_ALERT",
    severity: mentionRate === 0 ? "CRITICAL" : "CRITICAL",
    title: `Brand virtually absent — only ${pct(mentionRate * 100)} mention rate`,
    body: `Your brand appeared in only ${mentionedCount} of ${totalRuns} AI response runs (${pct(mentionRate * 100)}). At this level, AI models are effectively invisible to users asking questions in your market. This requires immediate action on content, citations, and entity presence.`,
    confidence: Math.min(0.95, 0.6 + totalRuns * 0.005),
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Mention rate", value: pct(mentionRate * 100), highlight: true },
          { label: "Mentions", value: mentionedCount },
          { label: "Total runs", value: totalRuns },
        ],
        windowDays: 1,
        dataPoints: totalRuns,
      },
      mentionRate,
      mentionedCount,
      totalRuns,
      recommendedAction: "Prioritize all HIGH-impact GEO recommendations immediately. Start with content creation for your strongest-potential categories, then pursue citation building.",
    },
  };
}

function detectScoreFreefall(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.snapshots.length < 5) return null;

  const recent = ctx.snapshots.slice(-5);
  const values = recent.map((s) => s.total);

  // Check for monotonically declining or near-monotonically declining
  let declines = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) declines++;
  }
  if (declines < 3) return null; // Need at least 3 consecutive declines

  const slope = linregSlope(
    recent.map((_, i) => i),
    values,
  );
  if (slope >= 0) return null; // Must be negative slope

  const { latestZ, isAnomaly } = summarizeSeries(values);
  if (!isAnomaly && Math.abs(slope) < 1) return null; // Only alert on meaningful drops

  const start = values[0];
  const end = values[values.length - 1];
  const changePct = start > 0 ? ((end - start) / start) * 100 : 0;

  return {
    kind: "STRATEGIC_ALERT",
    severity: Math.abs(changePct) > 20 ? "CRITICAL" : "ATTENTION",
    title: `Score freefall — ${pct(Math.abs(changePct))} decline over ${recent.length} days`,
    body: `Your AI visibility score has dropped ${pct(Math.abs(changePct))} over the past ${recent.length} days (from ${start} to ${end}). Slope: ${slope.toFixed(2)} pts/day. ${isAnomaly ? `Anomaly z-score: ${latestZ.toFixed(1)} (statistically significant).` : ""} This sustained decline suggests a structural issue, not a one-day fluctuation.`,
    confidence: Math.min(0.92, 0.55 + declines * 0.1),
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Score change", value: `${pct(Math.abs(changePct))} drop`, delta: changePct, highlight: true },
          { label: "Slope (pts/day)", value: slope.toFixed(2) },
          { label: "Consecutive declines", value: declines },
          { label: "Anomaly z-score", value: latestZ.toFixed(1) },
        ],
        windowDays: recent.length,
        dataPoints: recent.length,
      },
      slope,
      changePct,
      consecutiveDeclines: declines,
      latestZ,
      isAnomaly,
      recommendedAction: "Run a new scan immediately to confirm the trend. Compare this period with any content changes, technical updates, or competitor launches.",
    },
  };
}

function detectCompetitorDisplacement(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.competitorMetrics.length === 0 || ctx.latestRuns.length === 0) return null;

  const todayDate = new Date(ctx.todayIso);
  const last7Start = isoDay(addDays(todayDate, -7));
  const prior14Start = isoDay(addDays(todayDate, -21));

  const byCategory = groupBy(ctx.latestRuns, (r) => r.category);

  // Find categories where the brand has low mention rate but competitors are high
  const recentCompetitors = ctx.competitorMetrics.filter((m) => m.day >= last7Start);
  const priorCompetitors = ctx.competitorMetrics.filter(
    (m) => m.day >= prior14Start && m.day < last7Start,
  );

  const displacedCategories: string[] = [];

  for (const [category, runs] of Object.entries(byCategory)) {
    const brandMentionRate = runs.filter((r) => r.brandMentioned).length / runs.length;
    if (brandMentionRate >= 0.3) continue; // Brand is still present

    // Check if a competitor just started dominating this category
    const catCompetitorRecent = recentCompetitors.filter(
      (m) => (m.byCategory[category] as number | undefined) ?? 0 > 0,
    );
    const catCompetitorPrior = priorCompetitors.filter(
      (m) => (m.byCategory[category] as number | undefined) ?? 0 > 0,
    );

    const recentEntities = new Set(catCompetitorRecent.map((m) => m.entity));
    const priorEntities = new Set(catCompetitorPrior.map((m) => m.entity));

    // New competitor in this category
    const newInCat = [...recentEntities].filter((e) => !priorEntities.has(e));
    if (newInCat.length > 0 && brandMentionRate < 0.2) {
      displacedCategories.push(`${category.toLowerCase().replace(/_/g, " ")} (${newInCat[0]} moved in)`);
    }
  }

  if (displacedCategories.length === 0) return null;

  return {
    kind: "STRATEGIC_ALERT",
    severity: "ATTENTION",
    title: `Competitor displacement detected in ${displacedCategories.length} categor${displacedCategories.length === 1 ? "y" : "ies"}`,
    body: `Competitors have recently moved into categories where your brand is weak: ${displacedCategories.join("; ")}. This displacement pattern can compound quickly as AI models learn from reinforced patterns. Prioritize content for these categories before the gap widens.`,
    confidence: 0.7,
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Displaced categories", value: displacedCategories.length, highlight: true },
          ...displacedCategories.map((c) => ({ label: "Category", value: c })),
        ],
        windowDays: 21,
        dataPoints: recentCompetitors.length + priorCompetitors.length,
      },
      displacedCategories,
      affectedCategories: displacedCategories,
      recommendedAction: "Create high-quality, targeted content for each displaced category. Address competitor comparison queries directly with balanced, authoritative content.",
    },
  };
}

function detectCitationCollapse(ctx: ExecutiveContext): ExecutiveInsight | null {
  if (ctx.citationMetrics.length < 5) return null;

  const todayDate = new Date(ctx.todayIso);
  const last7Start = isoDay(addDays(todayDate, -7));
  const prior7Start = isoDay(addDays(todayDate, -14));

  const last7 = ctx.citationMetrics.filter((m) => m.day >= last7Start);
  const prior7 = ctx.citationMetrics.filter(
    (m) => m.day >= prior7Start && m.day < last7Start,
  );

  if (last7.length === 0 || prior7.length === 0) return null;

  const recentTotal = last7.reduce((s, c) => s + c.count, 0);
  const priorTotal = prior7.reduce((s, c) => s + c.count, 0);

  if (priorTotal === 0) return null;

  const citationDeltaPct = ((recentTotal - priorTotal) / priorTotal) * 100;
  if (citationDeltaPct > -30) return null; // Only flag severe drops

  return {
    kind: "STRATEGIC_ALERT",
    severity: citationDeltaPct < -50 ? "CRITICAL" : "ATTENTION",
    title: `Citation collapse — total AI citations down ${pct(Math.abs(citationDeltaPct))}`,
    body: `Total AI citations dropped from ${priorTotal} to ${recentTotal} (${pct(Math.abs(citationDeltaPct))} decline week-over-week). Citations are the primary mechanism by which AI models "remember" your brand. A sharp drop predicts a future visibility score decline. Investigate whether key citation sources were removed, updated, or deprioritized.`,
    confidence: 0.78,
    forDay: ctx.todayIso,
    metadata: {
      evidence: {
        items: [
          { label: "Recent citations (7d)", value: recentTotal, highlight: true },
          { label: "Prior citations (7d)", value: priorTotal, delta: citationDeltaPct },
          { label: "Change", value: pct(citationDeltaPct) },
        ],
        windowDays: 14,
        dataPoints: last7.length + prior7.length,
        comparedTo: "prior_7d",
      },
      recentTotal,
      priorTotal,
      citationDeltaPct,
      recommendedAction: "Identify which citation domains stopped appearing and investigate whether content was removed, access was restricted, or authority changed.",
    },
  };
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const PROVIDER_LABEL: Record<string, string> = {
  OPENAI: "ChatGPT",
  ANTHROPIC: "Claude",
  GOOGLE: "Gemini",
  PERPLEXITY: "Perplexity",
};

const groupBy = <T>(arr: T[], key: (item: T) => string): Record<string, T[]> => {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    out[k] ??= [];
    out[k].push(item);
  }
  return out;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
