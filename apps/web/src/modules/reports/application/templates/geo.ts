import "server-only";
import { geoQueries } from "@/modules/geo";
import type { ReportContent, ReportTemplateFn } from "../../domain/types";
import { barChart } from "../charts";

/**
 * GEO Optimization report.
 *
 * Project-scoped. Sections:
 *   - Headline: open / in-progress counts per category.
 *   - Category bar chart.
 *   - Detailed table of top recommendations.
 *   - Callouts for critical items.
 */

const CATEGORIES = ["CONTENT", "TECHNICAL", "AUTHORITY", "AI_OPTIMIZATION"] as const;

export const geoTemplate: ReportTemplateFn = async (ctx) => {
  if (!ctx.projectId) {
    throw new Error("geoTemplate requires projectId");
  }
  const [list, summary] = await Promise.all([
    geoQueries.listRecommendations({ projectId: ctx.projectId, limit: 30 }),
    geoQueries.getSummary(ctx.projectId),
  ]);

  const totalOpen = [...summary.values()].reduce((s, v) => s + v.open, 0);
  const totalInProgress = [...summary.values()].reduce(
    (s, v) => s + v.inProgress,
    0,
  );

  const easyWins = list.filter((r) => r.difficulty === "EASY").slice(0, 5);

  return {
    template: "GEO_OPTIMIZATION",
    title: ctx.parameters.title ?? "GEO Optimization Report",
    subtitle: "Prioritized actions to improve AI visibility",
    rangeLabel: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    sections: [
      {
        heading: "Headline",
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Open", value: String(totalOpen) },
              { label: "In progress", value: String(totalInProgress) },
              {
                label: "Top priority",
                value: list[0]?.priorityScore.toFixed(1) ?? "—",
              },
              { label: "Easy wins", value: String(easyWins.length) },
            ],
          },
        ],
      },
      {
        heading: "Open by category",
        blocks: [
          {
            type: "chart",
            svg: barChart({
              title: "Open recommendations",
              bars: CATEGORIES.map((c) => ({
                label: prettyCategory(c),
                value: summary.get(c)?.open ?? 0,
              })),
            }),
          },
        ],
      },
      {
        heading: "Top priorities",
        blocks: [
          {
            type: "table",
            columns: [
              "#",
              "Category",
              "Title",
              "Impact",
              "Difficulty",
              "Priority",
            ],
            rows: list.slice(0, 15).map((r, i) => [
              i + 1,
              prettyCategory(r.category),
              r.title,
              r.impactScore,
              r.difficulty,
              r.priorityScore.toFixed(2),
            ]),
          },
        ],
      },
      ...(easyWins.length > 0
        ? [
            {
              heading: "Quick wins",
              lead: "EASY-difficulty items worth doing this week.",
              blocks: easyWins.flatMap((r) => [
                {
                  type: "callout" as const,
                  tone: "info" as const,
                  text: `${r.title} — ${r.action}`,
                },
              ]),
            },
          ]
        : []),
    ],
    notes: [
      "Priority = (impact × confidence) ÷ difficulty cost.",
      "Recommendations are deterministic outputs of the GEO engine — re-running with the same data produces the same list.",
    ],
  };
};

const prettyCategory = (c: string): string =>
  c
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
