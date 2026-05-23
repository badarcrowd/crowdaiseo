import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfidenceScore } from "@/modules/trust";

type Props = {
  confidence: ConfidenceScore;
  showScore?: boolean;
  className?: string;
};

const TIER_CONFIG = {
  VERY_HIGH: {
    label: "Very High Confidence",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    Icon: ShieldCheck,
  },
  HIGH: {
    label: "High Confidence",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    Icon: ShieldCheck,
  },
  MEDIUM: {
    label: "Medium Confidence",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    Icon: Shield,
  },
  LOW: {
    label: "Low Confidence",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    Icon: ShieldAlert,
  },
  VERY_LOW: {
    label: "Very Low Confidence",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    Icon: ShieldX,
  },
} as const;

export function ConfidenceBadge({ confidence, showScore = false, className }: Props) {
  const cfg = TIER_CONFIG[confidence.tier];
  const { Icon } = cfg;

  const tooltipLines = [
    `Evidence: ${confidence.evidenceCount} data points`,
    `Freshness: ${Math.round(confidence.freshnessScore * 100)}%`,
    confidence.volatilityPenalty > 0
      ? `Volatility penalty: -${Math.round(confidence.volatilityPenalty * 100)}%`
      : null,
    confidence.anomalyPenalty > 0
      ? `Anomaly penalty: -${Math.round(confidence.anomalyPenalty * 100)}%`
      : null,
  ].filter(Boolean);

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
            {showScore && (
              <span className="ml-0.5 tabular-nums opacity-70">
                {Math.round(confidence.score * 100)}%
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-1 text-xs">
          <p className="font-semibold">{cfg.label}</p>
          {tooltipLines.map((line) => (
            <p key={line} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
