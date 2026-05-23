"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RefreshCw, Download, Link2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { PROVIDER_LABEL } from "../presentation/labels";
import { ScoreOverview } from "./score-overview";
import { ProviderMatrix } from "./provider-matrix";
import { MentionTrend } from "./mention-trend";
import { CompetitorChart } from "./competitor-chart";
import { SentimentChart } from "./sentiment-chart";
import { CitationSources } from "./citation-sources";
import { PromptPerformance } from "./prompt-performance";
import { RankingChart } from "./ranking-chart";
import type { AnalyticsData, DateRange, ProviderFilter } from "./types";

const DATE_RANGES: DateRange[] = ["7d", "30d", "90d"];
const PROVIDERS = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"] as const;

type Props = {
  data: AnalyticsData;
  range: DateRange;
  providerFilter: ProviderFilter;
};

export function DashboardShell({
  data,
  range,
  providerFilter,
}: Readonly<Props>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Auto-refresh every 5 s while a scan is running
  useEffect(() => {
    if (!data.isAnyScanRunning) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [data.isAnyScanRunning, router]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const exportCsv = () => {
    const header =
      "Prompt,Category,Total Runs,Mention Rate,Avg Rank,Avg Sentiment\n";
    const rows = data.promptStats.map((s) =>
      [
        `"${s.name.replaceAll('"', '""')}"`,
        s.category,
        s.totalRuns,
        `${Math.round(s.mentionRate * 100)}%`,
        s.avgRank !== null ? s.avgRank.toFixed(1) : "",
        s.sentimentAvg.toFixed(2),
      ].join(","),
    );
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aiv-analytics-${range}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .catch(() => undefined);
  };

  const mentionPct =
    data.totalRuns > 0
      ? Math.round((data.mentionedRuns / data.totalRuns) * 100)
      : null;

  return (
    <div className={cn("space-y-6", isPending && "opacity-70 pointer-events-none transition-opacity")}>

      {/* ── Filter + action bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Segmented date range */}
        <div className="flex items-center overflow-hidden rounded-md border border-border">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setParam("range", r)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                range === r
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Provider filter */}
        <Select
          value={providerFilter}
          onValueChange={(v) => setParam("provider", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All providers</SelectItem>
            {PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Link2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={data.promptStats.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Live scan banner ── */}
      {data.isAnyScanRunning && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Activity className="text-info h-4 w-4 shrink-0 animate-pulse" />
            <span className="text-muted-foreground text-xs">
              Scan in progress — analytics refresh automatically every 5 s.
            </span>
            <Badge variant="info" className="ml-auto">
              Live
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* ── Summary stat strip ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatChip
          label="AI Visibility"
          value={
            data.latestScore !== null ? data.latestScore.toString() : "—"
          }
          sub="/ 100"
          highlight={
            data.latestScore !== null && data.prevScore !== null
              ? data.latestScore - data.prevScore
              : undefined
          }
        />
        <StatChip
          label="Mention rate"
          value={mentionPct !== null ? `${mentionPct}%` : "—"}
          sub={`${data.totalRuns} runs`}
        />
        <StatChip
          label="Avg brand rank"
          value={
            data.scoreBreakdown?.breakdown.avgRank != null
              ? `#${data.scoreBreakdown.breakdown.avgRank}`
              : "—"
          }
          sub="lower is better"
        />
        <StatChip
          label="Citations"
          value={
            data.scoreBreakdown?.breakdown.citationCount != null
              ? data.scoreBreakdown.breakdown.citationCount.toLocaleString()
              : "—"
          }
          sub={`in last ${range}`}
        />
      </div>

      {/* ── Row 1: Score overview + Provider matrix ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreOverview
          latestScore={data.latestScore}
          prevScore={data.prevScore}
          scoreBreakdown={data.scoreBreakdown}
        />
        <div className="lg:col-span-2">
          <ProviderMatrix matrixCells={data.matrixCells} />
        </div>
      </div>

      {/* ── Row 2: Mention frequency + Sentiment ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MentionTrend mentionTrend={data.mentionTrend} />
        <SentimentChart sentimentTrend={data.sentimentTrend} />
      </div>

      {/* ── Row 3: Competitor + Citations ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CompetitorChart competitorStats={data.competitorStats} />
        <CitationSources citationStats={data.citationStats} />
      </div>

      {/* ── Row 4: Prompt performance table (full) ── */}
      <PromptPerformance promptStats={data.promptStats} />

      {/* ── Row 5: Ranking trends (full) ── */}
      <RankingChart rankingTrend={data.rankingTrend} />
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  sub,
  highlight,
}: Readonly<{
  label: string;
  value: string;
  sub?: string;
  highlight?: number;
}>) {
  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </span>
        {highlight !== undefined && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              highlight > 0
                ? "text-success"
                : highlight < 0
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {highlight > 0 ? "+" : ""}
            {highlight}
          </span>
        )}
      </div>
      {sub && (
        <div className="text-muted-foreground mt-0.5 text-[11px]">{sub}</div>
      )}
    </div>
  );
}
