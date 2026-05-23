import { cn } from "@/lib/utils/cn";

type Props = {
  confidence: number; // 0..1
  className?: string;
  showLabel?: boolean;
};

export function ConfidenceBadge({ confidence, className, showLabel = true }: Readonly<Props>) {
  const pct = Math.round(confidence * 100);
  const tier =
    pct >= 80 ? "high" : pct >= 60 ? "medium" : "low";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
        tier === "high" && "bg-success/10 text-success",
        tier === "medium" && "bg-warning/10 text-warning",
        tier === "low" && "bg-muted text-muted-foreground",
        className,
      )}
      title={`${pct}% confidence`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tier === "high" && "bg-success",
          tier === "medium" && "bg-warning",
          tier === "low" && "bg-muted-foreground",
        )}
      />
      {showLabel && `${pct}%`}
    </span>
  );
}
