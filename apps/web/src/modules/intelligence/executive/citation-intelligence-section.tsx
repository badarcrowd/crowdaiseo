import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TrendIndicator } from "../components/trend-indicator";
import type { CitationIntelligenceData } from "../queries";

type Props = {
  data: CitationIntelligenceData;
};

function AuthorityBar({ score }: { score: number }) {
  const pct = Math.min(100, score * 10);
  const color =
    score >= 7 ? "bg-success" : score >= 4 ? "bg-warning" : "bg-muted-foreground";
  return (
    <div className="bg-muted h-1 w-12 overflow-hidden rounded-full">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CitationIntelligenceSection({ data }: Readonly<Props>) {
  if (data.topDomains.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No citation data yet
      </div>
    );
  }

  const max = data.topDomains[0]?.totalCitations ?? 1;

  return (
    <div className="space-y-1">
      {data.topDomains.slice(0, 6).map((domain, i) => (
        <div
          key={domain.domain}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
        >
          <span className="text-muted-foreground w-4 text-right text-[10px] tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground truncate text-xs font-medium">
                {domain.domain}
              </span>
              <ExternalLink className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
            </div>
            <div className="bg-muted mt-0.5 h-0.5 overflow-hidden rounded-full">
              <div
                className="bg-chart-1 h-full rounded-full transition-all"
                style={{ width: `${(domain.totalCitations / max) * 100}%` }}
              />
            </div>
          </div>
          <AuthorityBar score={domain.avgAuthority} />
          <div className="flex w-10 items-center justify-end gap-1">
            <span className="text-foreground tabular-nums text-xs font-medium">
              {domain.totalCitations}
            </span>
            <TrendIndicator
              delta={domain.trend === "up" ? 1 : domain.trend === "down" ? -1 : 0}
              formatter={() => ""}
              size="sm"
            />
          </div>
        </div>
      ))}

      <div className="border-border mt-2 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
        <span>{data.totalCitations.toLocaleString()} total citations</span>
        <span>Avg authority: {data.avgAuthority.toFixed(1)}</span>
      </div>
    </div>
  );
}
