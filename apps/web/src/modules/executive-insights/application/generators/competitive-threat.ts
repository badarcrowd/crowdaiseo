import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { classifyThreat } from "../../domain/types";
import { groupBy, mean, pct, linregSlope } from "../math";

const WEEK = 7;

/**
 * Competitive Threat Generator.
 *
 * Detects:
 * 1. COMPETITOR_NEW_ENTRANT — entity absent in prior 14d but present this week.
 * 2. COMPETITIVE_THREAT — entity with accelerating share-of-voice (positive slope).
 * 3. COMPETITOR_DOMINANCE — entity dominating a specific prompt category.
 *
 * Emits insights with threat level classification and provider/category evidence.
 */
export const generateCompetitiveThreats = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.competitorMetrics.length === 0) return [];

  const out: ExecutiveInsight[] = [];
  const todayDate = new Date(ctx.todayIso);

  const last7Start = isoDay(addDays(todayDate, -7));
  const prior14Start = isoDay(addDays(todayDate, -21)); // prior window before last 7d
  const prior14End = last7Start;

  const last7 = ctx.competitorMetrics.filter((m) => m.day >= last7Start);
  const prior14 = ctx.competitorMetrics.filter(
    (m) => m.day >= prior14Start && m.day < prior14End,
  );

  const entitiesLast7 = new Set(last7.map((m) => m.entity));
  const entitiesPrior14 = new Set(prior14.map((m) => m.entity));

  // --- 1. New entrant detection ---
  for (const entity of entitiesLast7) {
    if (entitiesPrior14.has(entity)) continue;
    const rows = last7.filter((m) => m.entity === entity);
    const avgSov = mean(rows.map((r) => r.shareOfVoice));
    if (avgSov < 0.05) continue; // Noise threshold

    // Which providers?
    const providerTotals: Record<string, number> = {};
    for (const row of rows) {
      for (const [p, cnt] of Object.entries(row.byProvider)) {
        providerTotals[p] = (providerTotals[p] ?? 0) + (cnt as number);
      }
    }
    const topProviders = Object.entries(providerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([p]) => p);

    out.push({
      kind: "COMPETITOR_NEW_ENTRANT",
      severity: avgSov >= 0.2 ? "ATTENTION" : "INFO",
      title: `${entity} appeared in AI responses for the first time`,
      body: `${entity} started appearing in AI model responses this week (share of voice: ${pct(avgSov * 100)}). It was absent from all responses in the prior 14 days. Monitor whether this is an outlier or a new persistent competitor.`,
      confidence: Math.min(0.85, 0.5 + rows.length * 0.07),
      forDay: ctx.todayIso,
      metadata: {
        evidence: {
          items: [
            { label: "Share of voice", value: pct(avgSov * 100), highlight: true },
            { label: "Appearances this week", value: rows.reduce((s, r) => s + r.mentions, 0) },
          ],
          windowDays: 7,
          dataPoints: rows.length,
          comparedTo: "prior_30d",
        },
        competitor: entity,
        topProviders,
        avgShareOfVoice: avgSov,
        priorAppearances: 0,
      },
    });
  }

  // --- 2. Accelerating competitive threat ---
  const allEntities = Array.from(
    new Set(ctx.competitorMetrics.map((m) => m.entity)),
  );
  const thirtyStart = isoDay(addDays(todayDate, -30));
  const all30 = ctx.competitorMetrics.filter((m) => m.day >= thirtyStart);

  for (const entity of allEntities) {
    const series = all30
      .filter((m) => m.entity === entity)
      .map((m, i) => ({ x: i, y: m.shareOfVoice }));

    if (series.length < 5) continue;

    const slope = linregSlope(
      series.map((p) => p.x),
      series.map((p) => p.y),
    );

    // Significant positive slope = accelerating threat
    if (slope < 0.003) continue;

    const recentSov = mean(
      all30
        .filter((m) => m.entity === entity && m.day >= last7Start)
        .map((m) => m.shareOfVoice),
    );
    const priorSov = mean(
      all30
        .filter((m) => m.entity === entity && m.day < last7Start)
        .map((m) => m.shareOfVoice),
    );
    if (priorSov === 0) continue;

    const sovDeltaPct = ((recentSov - priorSov) / priorSov) * 100;
    const threatLevel = classifyThreat(sovDeltaPct, 0);

    // Identify dominant providers and categories
    const entityRows = all30.filter(
      (m) => m.entity === entity && m.day >= last7Start,
    );
    const catTotals: Record<string, number> = {};
    for (const row of entityRows) {
      for (const [cat, cnt] of Object.entries(row.byCategory)) {
        catTotals[cat] = (catTotals[cat] ?? 0) + (cnt as number);
      }
    }
    const topCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([c]) => c);

    out.push({
      kind: "COMPETITIVE_THREAT",
      severity: threatLevel === "CRITICAL" || threatLevel === "HIGH" ? "CRITICAL" : "ATTENTION",
      title: `${entity} is gaining momentum — share of voice up ${pct(sovDeltaPct)}`,
      body: `${entity}'s share of voice has trended upward over the past 30 days (slope: +${(slope * 100).toFixed(2)}% per day). Recent 7-day average: ${pct(recentSov * 100)} vs ${pct(priorSov * 100)} before. Threat level: ${threatLevel}. Strongest in: ${topCategories.join(", ") || "all categories"}.`,
      confidence: Math.min(0.9, 0.5 + series.length / 30),
      forDay: ctx.todayIso,
      metadata: {
        evidence: {
          items: [
            { label: "Recent SoV", value: pct(recentSov * 100), highlight: true },
            { label: "Prior SoV", value: pct(priorSov * 100), delta: sovDeltaPct },
            { label: "30d slope", value: `+${(slope * 1000).toFixed(1)}‰/day` },
          ],
          windowDays: 30,
          dataPoints: series.length,
          comparedTo: "prior_7d",
        },
        competitor: entity,
        threatLevel,
        sovDeltaPct,
        slope,
        topCategories,
        affectedCategories: topCategories,
      },
    });
  }

  // --- 3. Competitor dominating a prompt category ---
  const categoryMap = groupBy(last7, (m) => m.entity);
  for (const [entity, rows] of Object.entries(categoryMap)) {
    const catTotals: Record<string, number> = {};
    let totalMentions = 0;
    for (const row of rows) {
      for (const [cat, cnt] of Object.entries(row.byCategory)) {
        const c = cnt as number;
        catTotals[cat] = (catTotals[cat] ?? 0) + c;
        totalMentions += c;
      }
    }
    if (totalMentions === 0) continue;
    const dominantCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    if (!dominantCat) continue;
    const catShare = dominantCat[1] / totalMentions;
    if (catShare < 0.5) continue; // Only flag if >50% of their mentions are one category

    const catLabel = dominantCat[0].toLowerCase().replace(/_/g, " ");
    out.push({
      kind: "COMPETITOR_DOMINANCE",
      severity: "ATTENTION",
      title: `${entity} dominates ${catLabel} intent prompts`,
      body: `${pct(catShare * 100)} of ${entity}'s AI mentions this week were in ${catLabel} prompts. This suggests they are strongly positioned for that intent type. Consider creating content that directly answers ${catLabel} queries in your category.`,
      confidence: 0.72,
      forDay: ctx.todayIso,
      metadata: {
        evidence: {
          items: [
            { label: "Category dominance", value: pct(catShare * 100), highlight: true },
            { label: "Total mentions", value: totalMentions },
          ],
          windowDays: 7,
          dataPoints: rows.length,
        },
        competitor: entity,
        dominantCategory: dominantCat[0],
        categoryShare: catShare,
        affectedCategories: [dominantCat[0]],
      },
    });
  }

  return out;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
