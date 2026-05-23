"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/components/charts/radar-chart";
import type { ProviderProfile } from "../domain/types";

const AXES = [
  "Mention\nReliability",
  "Citation\nDensity",
  "Authority\nBias",
  "Community\nReliance",
  "Docs\nAffinity",
  "Rank\nStability",
  "Sentiment",
  "Category\nConsistency",
];

const AXES_LABELS = [
  "Mention",
  "Citations",
  "Authority",
  "Community",
  "Docs",
  "Stability",
  "Sentiment",
  "Consistency",
];

function profileToRadarData(profile: ProviderProfile): number[] {
  const s = profile.scores;
  return [
    s.mentionReliability,
    s.citationDensity,
    s.authorityPreference,
    s.communityReliance,
    s.documentationAffinity,
    s.rankStability,
    s.sentimentPositivity,
    s.categoryConsistency,
  ];
}

type Props = { profiles: ProviderProfile[] };

export function ProviderRadarGrid({ profiles }: Readonly<Props>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Radar Profiles</CardTitle>
        <CardDescription>
          8-axis behavioral fingerprint per provider — shape reveals recommendation strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {profiles.map((profile) => (
            <div key={profile.provider} className="flex flex-col items-center gap-2">
              <RadarChart
                axes={AXES_LABELS}
                series={[
                  {
                    name: profile.displayName,
                    color: profile.color,
                    data: profileToRadarData(profile),
                  },
                ]}
                size={180}
              />
              <div className="text-center">
                <div
                  className="text-xs font-semibold"
                  style={{ color: profile.color }}
                >
                  {profile.displayName}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[10px]">
                  {profile.raw.totalRuns} runs analyzed
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Composite overlay — all 4 on one chart */}
        <div className="border-border mt-6 border-t pt-6">
          <div className="text-muted-foreground mb-3 text-xs font-medium">
            Composite overlay — all providers
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
            <RadarChart
              axes={AXES_LABELS}
              series={profiles.map((p) => ({
                name: p.displayName,
                color: p.color,
                data: profileToRadarData(p),
              }))}
              size={260}
            />
            <div className="flex flex-wrap gap-x-6 gap-y-2 sm:flex-col">
              {profiles.map((p) => (
                <div key={p.provider} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-foreground text-xs font-medium">{p.displayName}</span>
                </div>
              ))}
              <div className="mt-2 space-y-1">
                {AXES_LABELS.map((label, i) => (
                  <div key={label} className="text-muted-foreground text-[10px]">
                    <span className="text-foreground font-medium">{label}</span>
                    {" — "}
                    {AXES[i]?.replace("\n", " ")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
