import type { ExecutiveContext, ExecutiveInsight } from "../../domain/types";
import { groupBy, mean, pct, signedPct } from "../math";

/**
 * Weekly Executive Summary Generator.
 *
 * Fires once per week (on or after Monday). Produces one
 * EXECUTIVE_WEEKLY_SUMMARY insight that rolls up the past 7 days:
 *   - Score movement (WoW)
 *   - Top competitor moves
 *   - Top GEO recommendation
 *   - Citation authority trend
 *
 * Confidence decays with missing snapshot coverage.
 */
const WEEK_DAYS = 7;

export const generateWeeklySummary = (
  ctx: ExecutiveContext,
): ExecutiveInsight[] => {
  if (ctx.snapshots.length < 3) return [];

  // Only generate on/after Monday each week and once per week
  const todayDate = new Date(ctx.todayIso);
  const dayOfWeek = todayDate.getUTCDay(); // 0=Sun, 1=Mon
  const isMonday = dayOfWeek === 1;
  // Allow generating up to Wednesday if Monday was missed
  const isWeeklyWindow = dayOfWeek >= 1 && dayOfWeek <= 3;
  if (!isWeeklyWindow) return [];

  // Anchor the week to the most recent Monday
  const mondayOffset = dayOfWeek === 1 ? 0 : dayOfWeek - 1;
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset - WEEK_DAYS);
  const weekEnd = new Date(todayDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - mondayOffset);
  const weekStartIso = isoDay(weekStart);
  const weekEndIso = isoDay(weekEnd);

  const thisWeek = ctx.snapshots.filter(
    (s) => s.day >= weekStartIso && s.day < weekEndIso,
  );
  const priorStart = isoDay(addDays(weekStart, -WEEK_DAYS));
  const priorWeek = ctx.snapshots.filter(
    (s) => s.day >= priorStart && s.day < weekStartIso,
  );

  if (thisWeek.length === 0) return [];

  const thisAvg = mean(thisWeek.map((s) => s.total));
  const priorAvg = priorWeek.length
    ? mean(priorWeek.map((s) => s.total))
    : null;
  const weekChange =
    priorAvg !== null && priorAvg > 0
      ? ((thisAvg - priorAvg) / priorAvg) * 100
      : 0;

  const direction = weekChange > 2 ? "up" : weekChange < -2 ? "down" : "flat";
  const coverage = thisWeek.length / WEEK_DAYS;
  const confidence = Math.min(0.95, 0.4 + coverage * 0.55);

  // Top competitor by share-of-voice this week
  const weekCompetitors = ctx.competitorMetrics.filter(
    (m) => m.day >= weekStartIso && m.day < weekEndIso,
  );
  const sovByEntity = groupBy(weekCompetitors, (m) => m.entity);
  const topCompetitor = Object.entries(sovByEntity)
    .map(([entity, rows]) => ({
      entity,
      sov: mean(rows.map((r) => r.shareOfVoice)),
    }))
    .sort((a, b) => b.sov - a.sov)[0];

  // Top GEO recommendation
  const topRec = ctx.topGeoRecs[0];

  // Citation authority trend
  const weekCitations = ctx.citationMetrics.filter(
    (m) => m.day >= weekStartIso && m.day < weekEndIso,
  );
  const priorCitations = ctx.citationMetrics.filter(
    (m) => m.day >= priorStart && m.day < weekStartIso,
  );
  const weekAuthAvg = weekCitations.length
    ? mean(weekCitations.map((c) => c.authorityScore))
    : null;
  const priorAuthAvg = priorCitations.length
    ? mean(priorCitations.map((c) => c.authorityScore))
    : null;
  const authDelta =
    weekAuthAvg !== null && priorAuthAvg !== null && priorAuthAvg > 0
      ? ((weekAuthAvg - priorAuthAvg) / priorAuthAvg) * 100
      : null;

  const title =
    direction === "up"
      ? `Week of ${weekStartIso} — visibility up ${pct(weekChange)}`
      : direction === "down"
        ? `Week of ${weekStartIso} — visibility down ${pct(weekChange)}`
        : `Week of ${weekStartIso} — visibility stable`;

  const bodyParts: string[] = [];
  if (priorAvg !== null) {
    bodyParts.push(
      `AI visibility score averaged ${Math.round(thisAvg)} this week vs ${Math.round(priorAvg)} the prior week (${signedPct(weekChange)}).`,
    );
  } else {
    bodyParts.push(`AI visibility score averaged ${Math.round(thisAvg)} this week.`);
  }
  if (topCompetitor) {
    bodyParts.push(
      `Top competitor by share of voice: ${topCompetitor.entity} (${pct(topCompetitor.sov * 100)} of runs).`,
    );
  }
  if (topRec) {
    bodyParts.push(`Highest-priority action: ${topRec.title}`);
  }
  if (authDelta !== null && Math.abs(authDelta) >= 5) {
    bodyParts.push(
      `Citation authority ${authDelta > 0 ? "improved" : "declined"} ${pct(authDelta)}.`,
    );
  }

  return [
    {
      kind: "EXECUTIVE_WEEKLY_SUMMARY",
      severity: direction === "down" && Math.abs(weekChange) > 10 ? "ATTENTION" : "INFO",
      title,
      body: bodyParts.join(" "),
      confidence,
      forDay: isoDay(isMonday ? todayDate : weekEnd),
      metadata: {
        evidence: {
          items: [
            {
              label: "This week avg",
              value: Math.round(thisAvg),
              highlight: true,
            },
            ...(priorAvg !== null
              ? [{ label: "Prior week avg", value: Math.round(priorAvg), delta: weekChange }]
              : []),
            ...(weekAuthAvg !== null
              ? [{ label: "Avg citation authority", value: weekAuthAvg.toFixed(2), delta: authDelta ?? undefined }]
              : []),
          ],
          windowDays: WEEK_DAYS,
          dataPoints: thisWeek.length,
          comparedTo: "prior_week" as const,
        },
        weekStart: weekStartIso,
        weekEnd: weekEndIso,
        weekChange,
        direction,
        topCompetitor: topCompetitor?.entity ?? null,
        topGeoAction: topRec?.title ?? null,
        snapshotCoverage: coverage,
      },
    },
  ];
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
