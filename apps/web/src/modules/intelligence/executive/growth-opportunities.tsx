import { Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ConfidenceBadge } from "../components/confidence-badge";
import type { InsightListItem } from "../queries";

const KIND_LABELS: Record<string, string> = {
  GROWTH_OPPORTUNITY: "Growth",
  PROVIDER_RECOMMENDATION: "Provider",
  CITATION_OPPORTUNITY: "Citation",
  CITATION_AUTHORITY_GAP: "Authority Gap",
  AI_PERCEPTION_POSITIVE: "Perception +",
  BRAND_TRUST_SIGNAL: "Trust Signal",
};

type Props = {
  opportunities: InsightListItem[];
  basePath: string;
  className?: string;
};

export function GrowthOpportunities({ opportunities, basePath, className }: Readonly<Props>) {
  if (opportunities.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="bg-chart-1/10 mb-3 flex h-10 w-10 items-center justify-center rounded-full">
          <Zap className="text-chart-1 h-5 w-5" />
        </div>
        <p className="text-sm font-medium">No opportunities detected yet</p>
        <p className="text-muted-foreground mt-0.5 text-xs">Run a scan to generate intelligence</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {opportunities.slice(0, 6).map((opp) => (
        <div
          key={opp.id}
          className="border-border hover:border-border/80 hover:bg-secondary/30 rounded-xl border p-3 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="bg-success/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
              <Zap className="text-success h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-success bg-success/10 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {KIND_LABELS[opp.kind] ?? opp.kind.replace(/_/g, " ")}
                </span>
                <ConfidenceBadge confidence={opp.confidence} />
              </div>
              <p className="text-sm font-medium leading-snug">{opp.title}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                {opp.body}
              </p>
            </div>
          </div>
        </div>
      ))}

      {opportunities.length > 6 && (
        <Link
          href={`${basePath}/intelligence/insights?filter=opportunities`}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2 text-xs transition-colors"
        >
          View all {opportunities.length} opportunities
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
