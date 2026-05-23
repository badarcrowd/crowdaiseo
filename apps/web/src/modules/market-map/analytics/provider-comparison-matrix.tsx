"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ProviderProfile } from "../domain/types";

const DIMENSIONS: { key: keyof ProviderProfile["scores"]; label: string; description: string }[] =
  [
    { key: "mentionReliability", label: "Mention Rate", description: "Brand appears in responses" },
    { key: "citationDensity", label: "Citation Density", description: "How often sources are cited" },
    { key: "authorityPreference", label: "Authority Bias", description: "Preference for .edu/.gov/Wikipedia" },
    { key: "communityReliance", label: "Community Reliance", description: "Reddit / forum source usage" },
    { key: "documentationAffinity", label: "Docs Affinity", description: "Official documentation preference" },
    { key: "rankStability", label: "Rank Stability", description: "Inverse of ranking volatility" },
    { key: "sentimentPositivity", label: "Sentiment", description: "Average brand sentiment (50 = neutral)" },
    { key: "categoryConsistency", label: "Category Consistency", description: "Evenness across prompt types" },
  ];

type Props = { profiles: ProviderProfile[] };

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-foreground w-7 shrink-0 text-right text-[11px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function ProviderComparisonMatrix({ profiles }: Readonly<Props>) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Behavior Matrix</CardTitle>
        <CardDescription>
          Deterministic scores across 8 behavioral dimensions — evidence-backed from scan data
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-muted-foreground w-44 py-2 pr-4 text-left text-[11px] font-medium uppercase tracking-wider">
                Dimension
              </th>
              {profiles.map((p) => (
                <th
                  key={p.provider}
                  className="py-2 px-3 text-center text-[11px] font-semibold"
                  style={{ color: p.color }}
                >
                  {p.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map(({ key, label, description }) => {
              const rowKey = key;
              return (
                <tr
                  key={key}
                  className={cn(
                    "border-border border-t transition-colors",
                    hovered === rowKey ? "bg-secondary/40" : "",
                  )}
                  onMouseEnter={() => setHovered(rowKey)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <td className="py-3 pr-4">
                    <div className="text-foreground text-xs font-medium">{label}</div>
                    <div className="text-muted-foreground text-[10px]">{description}</div>
                  </td>
                  {profiles.map((p) => (
                    <td key={p.provider} className="px-3 py-3">
                      <ScoreBar value={p.scores[key]} color={p.color} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
