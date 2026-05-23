"use client";

import { useState } from "react";
import { RadarChart } from "@/components/charts/radar-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { providerColor, ProviderBadge } from "../components/provider-badge";
import { cn } from "@/lib/utils/cn";
import type { CompetitorIntelligenceData } from "../queries";

type View = "share" | "radar" | "trends" | "providers";

const ENTITY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function ShareOfVoiceChart({
  data,
}: {
  data: CompetitorIntelligenceData["shareOfVoice"];
}) {
  const max = Math.max(...data.map((d) => d.shareOfVoice), 0.01);

  return (
    <div className="space-y-2">
      {data.map((comp, i) => (
        <div key={comp.entity} className="group">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: ENTITY_COLORS[i % ENTITY_COLORS.length] }}
              />
              <span className="text-foreground text-sm font-medium truncate max-w-32">
                {comp.entity}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {comp.avgRank !== null && (
                <span className="text-muted-foreground">
                  Avg rank #{comp.avgRank.toFixed(1)}
                </span>
              )}
              <span className="text-foreground tabular-nums font-semibold">
                {(comp.shareOfVoice * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(comp.shareOfVoice / max) * 100}%`,
                background: ENTITY_COLORS[i % ENTITY_COLORS.length],
              }}
            />
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            {comp.mentions.toLocaleString()} mentions
          </div>
        </div>
      ))}
    </div>
  );
}

function RadarView({
  data,
}: {
  data: CompetitorIntelligenceData["shareOfVoice"];
}) {
  if (data.length === 0) return null;

  // Build axes from union of all category keys
  const allCategories = [
    ...new Set(data.flatMap((d) => Object.keys(d.byCategory))),
  ].slice(0, 6);

  if (allCategories.length < 3) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Not enough category data for radar view
      </p>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => allCategories.map((c) => d.byCategory[c] ?? 0)),
    1,
  );

  const series = data.slice(0, 4).map((d, i) => ({
    name: d.entity,
    color: ENTITY_COLORS[i % ENTITY_COLORS.length]!,
    data: allCategories.map((c) =>
      Math.round(((d.byCategory[c] ?? 0) / maxVal) * 100),
    ),
  }));

  return (
    <div className="flex flex-col items-center gap-4">
      <RadarChart
        axes={allCategories.map((c) =>
          c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " "),
        )}
        series={series}
        size={260}
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendsView({ data }: { data: CompetitorIntelligenceData }) {
  if (data.trends.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No trend data available yet
      </p>
    );
  }

  const entities = [
    ...new Set(data.trends.flatMap((t) => Object.keys(t.byEntity))),
  ].slice(0, 5);

  const labels = data.trends.map((t) => {
    const d = new Date(t.day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const series = entities.map((entity, i) => ({
    name: entity,
    color: ENTITY_COLORS[i % ENTITY_COLORS.length]!,
    data: data.trends.map((t) => Math.round((t.byEntity[entity] ?? 0) * 100)),
  }));

  return (
    <AreaChart
      labels={labels}
      series={series}
      height={220}
      yFormatter="percent"
    />
  );
}

function ProviderView({
  data,
}: {
  data: CompetitorIntelligenceData["shareOfVoice"];
}) {
  const providers = [
    ...new Set(data.flatMap((d) => Object.keys(d.byProvider))),
  ];
  if (providers.length === 0 || data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No provider breakdown available
      </p>
    );
  }

  // Matrix: rows = competitors, cols = providers
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground py-2 text-left text-xs font-medium">
              Competitor
            </th>
            {providers.map((p) => (
              <th key={p} className="py-2 text-center">
                <ProviderBadge provider={p} size="xs" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 6).map((comp, i) => {
            const rowMax = Math.max(...providers.map((p) => comp.byProvider[p] ?? 0), 1);
            return (
              <tr key={comp.entity} className="border-border border-b last:border-0">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-sm shrink-0"
                      style={{ background: ENTITY_COLORS[i % ENTITY_COLORS.length] }}
                    />
                    <span className="text-foreground text-xs font-medium truncate max-w-28">
                      {comp.entity}
                    </span>
                  </div>
                </td>
                {providers.map((p) => {
                  const val = comp.byProvider[p] ?? 0;
                  const intensity = rowMax > 0 ? val / rowMax : 0;
                  return (
                    <td key={p} className="py-2 text-center">
                      <div
                        className="mx-auto flex h-7 w-10 items-center justify-center rounded text-[10px] font-medium tabular-nums"
                        style={{
                          background: `${providerColor(p)}${Math.round(intensity * 80 + 15).toString(16).padStart(2, "0")}`,
                        }}
                      >
                        {val > 0 ? val : "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  data: CompetitorIntelligenceData;
};

export function CompetitorCenter({ data }: Readonly<Props>) {
  const [view, setView] = useState<View>("share");

  const views: { id: View; label: string }[] = [
    { id: "share", label: "Share of Voice" },
    { id: "radar", label: "Category Radar" },
    { id: "trends", label: "30d Trends" },
    { id: "providers", label: "Provider Matrix" },
  ];

  if (data.shareOfVoice.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No competitor data available</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add competitors to your project to see intelligence here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View tabs */}
      <div className="border-border flex items-center gap-1 border-b pb-1">
        {views.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View content */}
      {view === "share" && <ShareOfVoiceChart data={data.shareOfVoice} />}
      {view === "radar" && <RadarView data={data.shareOfVoice} />}
      {view === "trends" && <TrendsView data={data} />}
      {view === "providers" && <ProviderView data={data.shareOfVoice} />}
    </div>
  );
}
