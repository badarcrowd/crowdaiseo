import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProviderProfile } from "../domain/types";

function sentimentLabel(v: number) {
  if (v > 0.1) return "Positive";
  if (v < -0.05) return "Negative";
  return "Neutral";
}

function SCORE_LABEL(v: number) {
  if (v >= 70) return "High";
  if (v >= 40) return "Mid";
  return "Low";
}

function SCORE_VARIANT(v: number): "default" | "info" | "outline" {
  if (v >= 70) return "default";
  if (v >= 40) return "info";
  return "outline";
}

type StatPillProps = { label: string; value: number; color: string };

function StatPill({ label, value, color }: Readonly<StatPillProps>) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
        style={{
          backgroundColor: color,
          color: "hsl(var(--background))",
          opacity: 0.85 + (value / 100) * 0.15,
        }}
      >
        {value}
      </div>
      <span className="text-muted-foreground text-[9px] leading-none">{label}</span>
    </div>
  );
}

type Props = { profiles: ProviderProfile[] };

export function ProviderProfileCards({ profiles }: Readonly<Props>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {profiles.map((p) => (
        <Card key={p.provider} className="relative overflow-hidden">
          {/* Color accent bar */}
          <div
            className="absolute left-0 top-0 h-1 w-full"
            style={{ backgroundColor: p.color }}
          />
          <CardContent className="pt-5">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="text-foreground text-sm font-semibold">{p.displayName}</div>
                <div className="text-muted-foreground text-[10px]">
                  {p.raw.totalRuns > 0
                    ? `${p.raw.totalRuns.toLocaleString()} runs`
                    : "No data"}
                </div>
              </div>
              <Badge variant={SCORE_VARIANT(p.scores.mentionReliability)}>
                {SCORE_LABEL(p.scores.mentionReliability)} reliability
              </Badge>
            </div>

            {/* Characterization */}
            <p className="text-muted-foreground mb-4 text-[11px] leading-relaxed">
              {p.characterization}
            </p>

            {/* Score pills */}
            <div className="mb-4 flex items-start justify-between gap-1">
              <StatPill label="Mention" value={p.scores.mentionReliability} color={p.color} />
              <StatPill label="Citations" value={p.scores.citationDensity} color={p.color} />
              <StatPill label="Authority" value={p.scores.authorityPreference} color={p.color} />
              <StatPill label="Stability" value={p.scores.rankStability} color={p.color} />
              <StatPill label="Sentiment" value={p.scores.sentimentPositivity} color={p.color} />
            </div>

            {/* Top cited domains */}
            {p.topDomains.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  Top Cited Domains
                </div>
                <div className="space-y-1">
                  {p.topDomains.slice(0, 4).map((d) => (
                    <div key={d.domain} className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-[10px] font-medium"
                        title={d.domain}
                      >
                        {d.domain}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-muted-foreground text-[10px]">{d.type}</span>
                        <span
                          className="rounded px-1 py-0.5 text-[9px] font-semibold"
                          style={{
                            backgroundColor: p.color,
                            color: "hsl(var(--background))",
                            opacity: 0.8,
                          }}
                        >
                          ×{d.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw metrics footer */}
            <div className="border-border mt-4 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-3">
              <div>
                <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                  Avg Rank
                </div>
                <div className="text-foreground text-xs font-semibold">
                  {p.raw.avgBrandRank === null ? "—" : `#${p.raw.avgBrandRank.toFixed(1)}`}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                  Sentiment
                </div>
                <div className="text-foreground text-xs font-semibold">
                  {sentimentLabel(p.raw.avgSentiment)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                  Citation Rate
                </div>
                <div className="text-foreground text-xs font-semibold">
                  {Math.round(p.raw.citationRate * 100)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                  Volatility
                </div>
                <div className="text-foreground text-xs font-semibold">
                  {p.raw.volatility > 0 ? `${Math.round(p.raw.volatility)}` : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
