import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type Severity = "critical" | "warning" | "info" | "success";

export type AlertItem = {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  timestamp: string;
};

const SEVERITY: Record<Severity, { icon: LucideIcon; className: string; ring: string }> = {
  critical: {
    icon: AlertTriangle,
    className: "text-destructive",
    ring: "bg-destructive/10",
  },
  warning: {
    icon: TrendingDown,
    className: "text-warning",
    ring: "bg-[hsl(var(--warning)/0.12)]",
  },
  info: {
    icon: Sparkles,
    className: "text-info",
    ring: "bg-[hsl(var(--info)/0.12)]",
  },
  success: {
    icon: TrendingUp,
    className: "text-success",
    ring: "bg-[hsl(var(--success)/0.12)]",
  },
};

export function RecentAlerts({ items }: Readonly<{ items: AlertItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>
              Anomalies, opportunities, and threshold breaches
            </CardDescription>
          </div>
          <button className="text-muted-foreground hover:text-foreground text-xs font-medium">
            View all
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((a) => {
          const cfg = SEVERITY[a.severity];
          const Icon = cfg.icon;
          return (
            <div
              key={a.id}
              className="hover:bg-secondary/40 -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  cfg.ring,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", cfg.className)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-foreground truncate text-sm font-medium">
                    {a.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                    {a.timestamp}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                  {a.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
