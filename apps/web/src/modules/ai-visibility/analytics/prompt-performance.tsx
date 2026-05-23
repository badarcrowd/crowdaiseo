"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATEGORY_META } from "../presentation/labels";
import { cn } from "@/lib/utils/cn";
import type { PromptStat } from "./types";
import type { PromptCategory } from "@prisma/client";

type SortKey = "totalRuns" | "mentionRate" | "avgRank" | "sentimentAvg";
type SortDir = "asc" | "desc";

export function PromptPerformance({
  promptStats,
}: Readonly<{ promptStats: PromptStat[] }>) {
  const [sortKey, setSortKey] = useState<SortKey>("mentionRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...promptStats].sort((a, b) => {
    const rankFallback = sortKey === "avgRank" ? Infinity : 0;
    const av = (a[sortKey] ?? rankFallback) as number;
    const bv = (b[sortKey] ?? rankFallback) as number;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  function SortIcon({ k }: Readonly<{ k: SortKey }>) {
    if (sortKey !== k)
      return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 shrink-0" />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Performance</CardTitle>
        <CardDescription>
          {promptStats.length > 0
            ? `${promptStats.length} prompts tracked — click headers to sort`
            : "No prompt data in this period"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {promptStats.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-6 text-sm">
            Run a scan to see per-prompt analytics.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">Prompt</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium text-right">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("totalRuns")}
                    >
                      Runs <SortIcon k="totalRuns" />
                    </button>
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("mentionRate")}
                    >
                      Mention% <SortIcon k="mentionRate" />
                    </button>
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("avgRank")}
                    >
                      Avg Rank <SortIcon k="avgRank" />
                    </button>
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("sentimentAvg")}
                    >
                      Sentiment <SortIcon k="sentimentAvg" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const catMeta = CATEGORY_META[p.category as PromptCategory];
                  const pct = Math.round(p.mentionRate * 100);
                  return (
                    <tr
                      key={p.promptId}
                      className="border-border hover:bg-secondary/30 border-b transition-colors last:border-0"
                    >
                      <td className="max-w-xs truncate px-4 py-3 font-medium">
                        {p.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              background:
                                catMeta?.color ?? "hsl(var(--muted-foreground))",
                            }}
                          />
                          <span className="text-muted-foreground text-xs">
                            {catMeta?.label ?? p.category}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs">
                        {p.totalRuns}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: "hsl(var(--chart-1))",
                              }}
                            />
                          </div>
                          <span className="w-8 tabular-nums text-xs">
                            {pct}%
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs">
                        {p.avgRank !== null ? `#${p.avgRank}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            "tabular-nums text-xs",
                            p.sentimentAvg > 0.1
                              ? "text-success"
                              : p.sentimentAvg < -0.1
                                ? "text-destructive"
                                : "text-muted-foreground",
                          )}
                        >
                          {p.sentimentAvg > 0 ? "+" : ""}
                          {p.sentimentAvg.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
