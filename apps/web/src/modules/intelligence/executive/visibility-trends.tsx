"use client";

import { useState } from "react";
import { AreaChart } from "@/components/charts/area-chart";
import { providerColor } from "../components/provider-badge";
import type { VisibilityTrendPoint } from "../queries";

const PROVIDERS = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"] as const;
const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: "ChatGPT",
  ANTHROPIC: "Claude",
  GOOGLE: "Gemini",
  PERPLEXITY: "Perplexity",
};

type View = "total" | "providers";

type Props = {
  data: VisibilityTrendPoint[];
};

export function VisibilityTrends({ data }: Readonly<Props>) {
  const [view, setView] = useState<View>("total");

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No trend data yet — run a scan to begin tracking
      </div>
    );
  }

  const labels = data.map((d) => {
    const date = new Date(d.day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const totalSeries = [
    {
      name: "AI Visibility",
      color: "hsl(var(--chart-1))",
      data: data.map((d) => d.total),
    },
  ];

  const providerSeries = PROVIDERS.filter((p) =>
    data.some((d) => d.byProvider[p] !== undefined),
  ).map((p) => ({
    name: PROVIDER_LABELS[p] ?? p,
    color: providerColor(p),
    data: data.map((d) => d.byProvider[p] ?? 0),
  }));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {(["total", "providers"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === v
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "total" ? "Overall" : "By Provider"}
          </button>
        ))}
      </div>
      <AreaChart
        labels={labels}
        series={view === "total" ? totalSeries : providerSeries}
        height={200}
        yFormatter="default"
      />
    </div>
  );
}
