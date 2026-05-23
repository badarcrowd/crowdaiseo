"use client";

import { useState } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Shield } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { providerColor, ProviderBadge } from "../components/provider-badge";
import { cn } from "@/lib/utils/cn";
import type { CitationIntelligenceData } from "../queries";

type View = "domains" | "trends" | "authority" | "providers";

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_COLOR = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

function AuthorityScore({ score }: { score: number }) {
  const pct = Math.min(10, score);
  const tier = score >= 7 ? "high" : score >= 4 ? "medium" : "low";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            tier === "high" ? "bg-success" : tier === "medium" ? "bg-warning" : "bg-muted-foreground",
          )}
          style={{ width: `${(pct / 10) * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] tabular-nums font-medium",
          tier === "high" ? "text-success" : tier === "medium" ? "text-warning" : "text-muted-foreground",
        )}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function TopDomainsView({ data }: { data: CitationIntelligenceData }) {
  const max = data.topDomains[0]?.totalCitations ?? 1;

  return (
    <div className="space-y-2">
      {data.topDomains.map((domain, i) => {
        const TrendIcon = TREND_ICON[domain.trend];
        return (
          <div
            key={domain.domain}
            className="border-border hover:bg-secondary/30 rounded-xl border p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-5 text-right text-[11px] tabular-nums font-medium shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-foreground text-sm font-medium truncate">
                    {domain.domain}
                  </span>
                  <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" />
                  <TrendIcon
                    className={cn("h-3 w-3 shrink-0 ml-0.5", TREND_COLOR[domain.trend])}
                  />
                </div>
                <div className="bg-muted h-1 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full transition-all"
                    style={{ width: `${(domain.totalCitations / max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <div className="text-foreground text-sm font-semibold tabular-nums">
                  {domain.totalCitations.toLocaleString()}
                </div>
                <AuthorityScore score={domain.avgAuthority} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendsView({ data }: { data: CitationIntelligenceData }) {
  if (data.trends.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">No trend data yet</p>
    );
  }

  const labels = data.trends.map((t) =>
    new Date(t.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );

  return (
    <AreaChart
      labels={labels}
      series={[
        {
          name: "Citations",
          color: "hsl(var(--chart-1))",
          data: data.trends.map((t) => t.total),
        },
        {
          name: "Avg Authority",
          color: "hsl(var(--chart-2))",
          data: data.trends.map((t) => Math.round(t.avgAuthority * 10)),
        },
      ]}
      height={200}
      yFormatter="default"
    />
  );
}

function AuthorityView({ data }: { data: CitationIntelligenceData }) {
  const sorted = [...data.topDomains].sort((a, b) => b.avgAuthority - a.avgAuthority);
  const buckets = [
    { label: "High (7–10)", domains: sorted.filter((d) => d.avgAuthority >= 7), color: "bg-success" },
    { label: "Medium (4–7)", domains: sorted.filter((d) => d.avgAuthority >= 4 && d.avgAuthority < 7), color: "bg-warning" },
    { label: "Low (0–4)", domains: sorted.filter((d) => d.avgAuthority < 4), color: "bg-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Authority Distribution</span>
        <span className="text-muted-foreground ml-auto text-xs">
          Avg: {data.avgAuthority.toFixed(1)} / 10
        </span>
      </div>
      {buckets.map(({ label, domains, color }) => (
        <div key={label}>
          <div className="text-muted-foreground mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {label} · {domains.length} domains
          </div>
          {domains.length > 0 ? (
            <div className="grid gap-1 sm:grid-cols-2">
              {domains.slice(0, 6).map((d) => (
                <div
                  key={d.domain}
                  className="border-border flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                >
                  <span className="text-foreground truncate text-xs font-medium flex-1">
                    {d.domain}
                  </span>
                  <span className="text-muted-foreground text-[10px] tabular-nums shrink-0">
                    {d.avgAuthority.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">None</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ProviderView({ data }: { data: CitationIntelligenceData }) {
  const providers = [
    ...new Set(data.topDomains.flatMap((d) => Object.keys(d.byProvider))),
  ];

  if (providers.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No provider data yet
      </p>
    );
  }

  const labels = data.topDomains.slice(0, 8).map((d) => d.domain);
  const series = providers.map((p) => ({
    name: p,
    color: providerColor(p),
    data: data.topDomains.slice(0, 8).map((d) => d.byProvider[p] ?? 0),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => <ProviderBadge key={p} provider={p} size="xs" />)}
      </div>
      <BarChart
        labels={labels}
        series={series}
        height={220}
        stacked
        yFormatter="default"
      />
    </div>
  );
}

type Props = {
  data: CitationIntelligenceData;
};

export function CitationCenter({ data }: Readonly<Props>) {
  const [view, setView] = useState<View>("domains");

  const views: { id: View; label: string }[] = [
    { id: "domains", label: "Top Domains" },
    { id: "trends", label: "Citation Trends" },
    { id: "authority", label: "Authority" },
    { id: "providers", label: "Provider Source" },
  ];

  if (data.topDomains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No citation data available</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Run visibility scans to populate citation intelligence
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-border rounded-xl border p-3 text-center">
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {data.totalCitations.toLocaleString()}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wider">
            Total Citations
          </div>
        </div>
        <div className="border-border rounded-xl border p-3 text-center">
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {data.avgAuthority.toFixed(1)}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wider">
            Avg Authority
          </div>
        </div>
      </div>

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

      {view === "domains" && <TopDomainsView data={data} />}
      {view === "trends" && <TrendsView data={data} />}
      {view === "authority" && <AuthorityView data={data} />}
      {view === "providers" && <ProviderView data={data} />}
    </div>
  );
}
