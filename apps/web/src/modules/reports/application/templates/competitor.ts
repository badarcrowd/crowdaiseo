import "server-only";
import { intelligenceQueries } from "@/modules/ai-visibility";
import { barChart, donutChart } from "../charts";
import type { ReportContent, ReportTemplateFn } from "../../domain/types";

/**
 * Competitor Analysis report.
 *
 * Contents:
 *   - Top competitors by mention volume + share of voice.
 *   - Share-of-voice donut.
 *   - Mention-volume bar chart.
 *   - Gap table (which competitors lead the brand, and where).
 */

export const competitorTemplate: ReportTemplateFn = async (ctx) => {
  if (!ctx.projectId) {
    throw new Error("competitorTemplate requires projectId");
  }
  const days = rangeDays(ctx.parameters);
  const top = await intelligenceQueries.getTopCompetitors(ctx.projectId, days, 10);

  const segments = top.slice(0, 6).map((c) => ({
    label: c.entity,
    value: c.mentions,
  }));

  return {
    template: "COMPETITOR_ANALYSIS",
    title: ctx.parameters.title ?? "Competitor Analysis",
    subtitle: "Who else AI is talking about",
    rangeLabel: rangeLabel(days),
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    sections: [
      {
        heading: "Headline",
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Competitors tracked", value: String(top.length) },
              {
                label: "Top entity",
                value: top[0]?.entity ?? "—",
              },
              {
                label: "Top share of voice",
                value: top[0]
                  ? `${Math.round(top[0].avgShareOfVoice * 100)}%`
                  : "—",
              },
              {
                label: "Window",
                value: `${days}d`,
              },
            ],
          },
        ],
      },
      {
        heading: "Share of voice",
        lead: "Within the competitor set (your brand excluded).",
        blocks: [
          {
            type: "chart",
            svg: donutChart({
              title: "Share of voice",
              segments: segments.length > 0
                ? segments
                : [{ label: "No data", value: 1 }],
            }),
          },
        ],
      },
      {
        heading: "Mention volume",
        blocks: [
          {
            type: "chart",
            svg: barChart({
              title: "Mentions per competitor",
              bars: top.slice(0, 8).map((c) => ({
                label: shortLabel(c.entity),
                value: c.mentions,
              })),
            }),
          },
          {
            type: "table",
            columns: ["Competitor", "Mentions", "Avg share of voice"],
            rows: top.map((c) => [
              c.entity,
              c.mentions,
              `${Math.round(c.avgShareOfVoice * 100)}%`,
            ]),
          },
        ],
      },
    ],
    notes: [
      "Share of voice is mentions ÷ total competitor mentions per day, averaged across the window.",
      "Brand mentions are intentionally excluded from share of voice — track those in the executive summary.",
    ],
  };
};

const rangeDays = (params: { rangeStart?: string; rangeEnd?: string }): number => {
  if (params.rangeStart && params.rangeEnd) {
    const ms = new Date(params.rangeEnd).getTime() - new Date(params.rangeStart).getTime();
    return Math.min(365, Math.max(1, Math.round(ms / 86_400_000)));
  }
  return 30;
};

const rangeLabel = (days: number): string => {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)} → ${fmt(end)} (${days} days)`;
};

const shortLabel = (s: string): string => (s.length > 12 ? `${s.slice(0, 11)}…` : s);
