"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { SeverityBadge } from "../components/severity-badge";
import { ProviderBadge } from "../components/provider-badge";
import { acknowledgeInsightAction } from "@/modules/executive-insights/presentation/actions";
import type { InsightListItem } from "../queries";

type Props = {
  alerts: InsightListItem[];
  workspaceId: string;
  className?: string;
};

export function CriticalAlerts({ alerts, workspaceId, className }: Readonly<Props>) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = alerts.filter(
    (a) => !dismissed.has(a.id) && !a.acknowledgedAt,
  );

  const dismiss = (id: string) => {
    startTransition(async () => {
      await acknowledgeInsightAction({ workspaceId, insightId: id });
      setDismissed((prev) => new Set([...prev, id]));
    });
  };

  if (active.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="bg-success/10 mb-3 flex h-10 w-10 items-center justify-center rounded-full">
          <AlertTriangle className="h-5 w-5 text-success" />
        </div>
        <p className="text-sm font-medium">No critical alerts</p>
        <p className="text-muted-foreground mt-0.5 text-xs">All systems nominal</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        {active.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8, height: 0 }}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              alert.severity === "CRITICAL"
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning/5",
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  alert.severity === "CRITICAL" ? "text-destructive" : "text-warning",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={alert.severity} />
                  {alert.affectedProviders.slice(0, 2).map((provider) => (
                    <ProviderBadge key={provider} provider={provider} size="xs" />
                  ))}
                </div>
                <p className="text-sm font-medium leading-snug">{alert.title}</p>

                {expanded === alert.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                      {alert.body}
                    </p>
                    {alert.recommendedAction && (
                      <p className="text-foreground mt-1.5 text-xs font-medium">
                        → {alert.recommendedAction}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                  className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      expanded === alert.id && "rotate-90",
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(alert.id)}
                  className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
