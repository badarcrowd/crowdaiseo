import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FreshnessStatus } from "@/modules/trust";

type Props = {
  freshness: FreshnessStatus;
  className?: string;
};

const BADGE_CONFIG = {
  FRESH: {
    label: "Fresh",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    Icon: CheckCircle2,
  },
  RECENT: {
    label: "Recent",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/10",
    Icon: CheckCircle2,
  },
  STALE: {
    label: "Stale",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    Icon: Clock,
  },
  OUTDATED: {
    label: "Outdated",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    Icon: AlertCircle,
  },
  MISSING: {
    label: "No Data",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
    Icon: XCircle,
  },
} as const;

const formatAge = (ageHours: number): string => {
  if (ageHours < 0) return "never";
  if (ageHours < 1) return "< 1 hour ago";
  if (ageHours < 24) return `${Math.round(ageHours)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
};

export function FreshnessBadge({ freshness, className }: Props) {
  const cfg = BADGE_CONFIG[freshness.badge];
  const { Icon } = cfg;

  const hasWarnings = freshness.warnings.length > 0;
  const errorWarnings = freshness.warnings.filter((w) => w.severity === "ERROR");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-default items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              cfg.color,
              cfg.bg,
              cfg.border,
              className,
            )}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
            <span className="opacity-60">·</span>
            <span className="tabular-nums opacity-70">{formatAge(freshness.ageHours)}</span>
          </span>
        </TooltipTrigger>
        {hasWarnings && (
          <TooltipContent side="top" className="max-w-xs space-y-1.5 text-xs">
            <p className="font-semibold">
              {errorWarnings.length > 0 ? "Data Quality Issues" : "Data Warnings"}
            </p>
            {freshness.warnings.map((w) => (
              <p
                key={w.code}
                className={cn(
                  w.severity === "ERROR" ? "text-destructive" : "text-warning",
                )}
              >
                {w.message}
              </p>
            ))}
            {freshness.coverageGaps.length > 0 && (
              <p className="text-muted-foreground">
                Missing provider data: {freshness.coverageGaps.join(", ")}
              </p>
            )}
          </TooltipContent>
        )}
        {!hasWarnings && (
          <TooltipContent side="top" className="text-xs">
            <p className="text-muted-foreground">
              Last updated {formatAge(freshness.ageHours)}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
