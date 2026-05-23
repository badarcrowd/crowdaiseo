import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProviderBadge, providerColor } from "../components/provider-badge";
import type { ProviderIntelligenceItem } from "../queries";

type Props = {
  providers: ProviderIntelligenceItem[];
};

export function ProviderIntelligence({ providers }: Readonly<Props>) {
  if (providers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No provider data yet
      </div>
    );
  }

  const sorted = [...providers].sort((a, b) => b.latestScore - a.latestScore);
  const maxScore = Math.max(...sorted.map((p) => p.latestScore), 1);

  return (
    <div className="space-y-3">
      {sorted.map((p) => {
        const color = providerColor(p.provider);
        const TrendIcon =
          p.trend === "up" ? TrendingUp : p.trend === "down" ? TrendingDown : Minus;

        return (
          <div key={p.provider} className="group">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ProviderBadge provider={p.provider} size="xs" />
                <TrendIcon
                  className={cn(
                    "h-3 w-3",
                    p.trend === "up" && "text-success",
                    p.trend === "down" && "text-destructive",
                    p.trend === "flat" && "text-muted-foreground",
                  )}
                />
              </div>
              <div className="flex items-center gap-3">
                {p.volatility > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span className="text-[10px] tabular-nums">{p.volatility}</span>
                  </div>
                )}
                <span className="text-foreground text-sm font-semibold tabular-nums">
                  {p.latestScore}
                </span>
              </div>
            </div>

            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(p.latestScore / maxScore) * 100}%`,
                  background: color,
                }}
              />
            </div>

            <div className="text-muted-foreground mt-0.5 text-[10px]">
              30d avg: {p.avgScore}
            </div>
          </div>
        );
      })}
    </div>
  );
}
