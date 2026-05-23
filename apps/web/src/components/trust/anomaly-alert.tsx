import { AlertTriangle, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Anomaly, AnomalyReport } from "@/modules/trust";

type Props = {
  report: AnomalyReport;
  limit?: number;
  className?: string;
};

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "text-destructive",
    bg: "bg-destructive/5 border-destructive/40",
    label: "Critical",
  },
  HIGH: {
    color: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
    label: "High",
  },
  MEDIUM: {
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.3)]",
    label: "Medium",
  },
  LOW: {
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-border",
    label: "Low",
  },
} as const;

const ANOMALY_ICON = {
  PROVIDER_SCORE_SPIKE: TrendingUp,
  PROVIDER_SCORE_DROP: TrendingDown,
  SCAN_INCONSISTENCY: AlertTriangle,
  CITATION_DOMAIN_SURGE: TrendingUp,
  CITATION_DOMAIN_DISAPPEAR: TrendingDown,
  SENTIMENT_SWING: Zap,
  COMPETITOR_SURGE: TrendingUp,
  STATISTICAL_OUTLIER: AlertTriangle,
  MISSING_SCAN_GAP: AlertTriangle,
} as const;

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  const cfg = SEVERITY_CONFIG[anomaly.severity];
  const Icon = ANOMALY_ICON[anomaly.type] ?? AlertTriangle;

  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2", cfg.bg)}>
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cfg.color)} />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "mr-1.5 inline-block rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            cfg.color,
          )}
        >
          {cfg.label}
        </span>
        <span className="text-foreground text-xs">{anomaly.description}</span>
        {anomaly.zScore !== undefined && (
          <span className="text-muted-foreground ml-1 text-[10px]">z={anomaly.zScore}</span>
        )}
      </div>
    </div>
  );
}

export function AnomalyAlert({ report, limit = 3, className }: Props) {
  if (!report.hasAnomalies) return null;

  const sorted = [...report.anomalies].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const displayed = sorted.slice(0, limit);
  const remaining = sorted.length - displayed.length;

  const worstCfg = report.worstSeverity
    ? SEVERITY_CONFIG[report.worstSeverity]
    : SEVERITY_CONFIG.LOW;

  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-2", className)}>
      <div className={cn("flex items-center gap-1.5 text-sm font-medium", worstCfg.color)}>
        <AlertTriangle className="h-4 w-4" />
        {report.anomalies.length} Anomal{report.anomalies.length === 1 ? "y" : "ies"} Detected
      </div>
      <div className="space-y-1.5">
        {displayed.map((a, i) => (
          <AnomalyRow key={`${a.type}-${a.affectedEntity}-${i}`} anomaly={a} />
        ))}
        {remaining > 0 && (
          <p className="text-muted-foreground pl-1 text-xs">
            +{remaining} more anomal{remaining === 1 ? "y" : "ies"}
          </p>
        )}
      </div>
    </div>
  );
}
