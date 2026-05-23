import "server-only";
import { intelligenceQueries } from "@/modules/ai-visibility";
import { geoQueries } from "@/modules/geo";
import { lineChart, donutChart } from "../charts";
import type { ReportContent, ReportTemplateFn } from "../../domain/types";

/**
 * Executive Summary — single-page-feel overview for leadership.
 *
 * Contents:
 *   - Cover with overall visibility score + period delta.
 *   - KPI band (score, runs, mention rate, citation diversity).
 *   - Score trend line.
 *   - Provider share donut.
 *   - Top 5 prioritized recommendations.
 *
 * Project-scoped: requires `parameters.projectId`.
 */

export const executiveSummaryTemplate: ReportTemplateFn = async (ctx) => {
  if (!ctx.projectId) {
    throw new Error("executiveSummaryTemplate requires projectId");
  }
  const days = rangeDays(ctx.parameters);
  const [trend, latest, recs] = await Promise.all([
    intelligenceQueries.getProjectScoreTrend(ctx.projectId, days),
    intelligenceQueries.getLatestSnapshot(ctx.projectId),
    geoQueries.listRecommendations({ projectId: ctx.projectId, limit: 5 }),
  ]);

  const latestScore = latest?.total ?? null;
  const firstScore = trend.length > 0 ? trend[0]?.total ?? null : null;
  const delta =
    latestScore !== null && firstScore !== null
      ? latestScore - firstScore
      : null;

  const byProvider = (latest?.byProvider as Record<string, number> | null) ?? {};
  const providerSegments = Object.entries(byProvider).map(([label, value]) => ({
    label,
    value: Math.max(0, value as number),
  }));

  const content: ReportContent = {
    template: "EXECUTIVE_SUMMARY",
    title: ctx.parameters.title ?? "Executive Summary",
    subtitle: "AI Visibility & Optimization snapshot",
    rangeLabel: rangeLabel(days),
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    sections: [
      {
        heading: "Headline metrics",
        blocks: [
          {
            type: "kpi",
            items: [
              {
                label: "Visibility score",
                value: latestScore !== null ? String(latestScore) : "—",
                delta:
                  delta !== null
                    ? `${delta >= 0 ? "+" : ""}${delta} vs start of period`
                    : undefined,
              },
              {
                label: "Confidence",
                value: latest
                  ? `${Math.round(latest.confidence * 100)}%`
                  : "—",
              },
              {
                label: "Samples",
                value: latest ? String(latest.sampleSize) : "0",
              },
              {
                label: "Open recommendations",
                value: String(recs.length),
              },
            ],
          },
        ],
      },
      {
        heading: "Score trend",
        blocks: [
          {
            type: "chart",
            svg: lineChart({
              title: "Visibility score",
              points: trend.map((t) => ({ x: t.day, y: t.total })),
            }),
            caption: `${trend.length} daily data points`,
          },
        ],
      },
      {
        heading: "Provider mix",
        blocks: [
          {
            type: "chart",
            svg: donutChart({
              title: "Per-provider score share",
              segments: providerSegments.length > 0
                ? providerSegments
                : [{ label: "No data", value: 1 }],
            }),
          },
        ],
      },
      {
        heading: "Top priorities",
        lead: recs.length > 0
          ? "Highest-priority GEO recommendations for this period."
          : "No open recommendations.",
        blocks: recs.length > 0
          ? [
              {
                type: "table",
                columns: ["Priority", "Title", "Impact", "Difficulty"],
                rows: recs.map((r) => [
                  r.priorityScore.toFixed(2),
                  r.title,
                  r.impactScore,
                  r.difficulty,
                ]),
              },
            ]
          : [{ type: "paragraph", text: "Nothing flagged." }],
      },
    ],
    notes: [
      "All metrics computed from the most recent visibility snapshot.",
      "Recommendation priority = (impact × confidence) ÷ difficulty cost.",
    ],
  };
  return content;
};

const rangeDays = (params: { rangeStart?: string; rangeEnd?: string }): number => {
  if (params.rangeStart && params.rangeEnd) {
    const ms = new Date(params.rangeEnd).getTime() - new Date(params.rangeStart).getTime();
    const d = Math.max(1, Math.round(ms / 86_400_000));
    return Math.min(d, 365);
  }
  return 30;
};

const rangeLabel = (days: number): string => {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)} → ${fmt(end)} (${days} days)`;
};
