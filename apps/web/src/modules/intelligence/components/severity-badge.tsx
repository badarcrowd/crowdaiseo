import { cn } from "@/lib/utils/cn";

type InsightSeverity = "CRITICAL" | "ATTENTION" | "INFO";

const CONFIG: Record<
  InsightSeverity,
  { label: string; classes: string; dot: string }
> = {
  CRITICAL: {
    label: "Critical",
    classes: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive animate-pulse",
  },
  ATTENTION: {
    label: "Attention",
    classes: "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
  },
  INFO: {
    label: "Info",
    classes: "bg-info/10 text-info border-info/20",
    dot: "bg-info",
  },
};

type Props = {
  severity: InsightSeverity;
  className?: string;
  pulse?: boolean;
};

export function SeverityBadge({ severity, className, pulse }: Readonly<Props>) {
  const cfg = CONFIG[severity] ?? CONFIG.INFO;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cfg.classes,
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", cfg.dot, pulse && "animate-pulse")}
      />
      {cfg.label}
    </span>
  );
}
