"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { SeverityBadge } from "./severity-badge";
import { ConfidenceBadge } from "./confidence-badge";
import { EvidenceViewer } from "./evidence-viewer";
import { ProviderBadge } from "./provider-badge";
import type { InsightListItem } from "../queries";

type Props = {
  insight: InsightListItem;
  onAcknowledge?: (id: string) => Promise<void>;
  defaultExpanded?: boolean;
  className?: string;
};

export function InsightCard({
  insight,
  onAcknowledge,
  defaultExpanded = false,
  className,
}: Readonly<Props>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pending, startTransition] = useTransition();

  const isAcknowledged = !!insight.acknowledgedAt;

  const handleAcknowledge = () => {
    if (!onAcknowledge || isAcknowledged) return;
    startTransition(async () => {
      await onAcknowledge(insight.id);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group rounded-xl border transition-all",
        isAcknowledged
          ? "border-border/50 bg-muted/20 opacity-60"
          : "border-border bg-card hover:border-border/80",
        insight.severity === "CRITICAL" && !isAcknowledged && "border-destructive/30",
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {/* Priority indicator */}
        <div
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold tabular-nums"
          style={{
            background: `hsl(var(--chart-1) / ${Math.max(0.1, insight.priority / 100)})`,
            color: "hsl(var(--chart-1))",
          }}
        >
          {insight.priority}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={insight.severity} />
            {insight.isNew && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                NEW
              </span>
            )}
            <span className="text-muted-foreground ml-auto text-[10px]">
              {new Date(insight.forDay).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <p className={cn("text-sm font-medium leading-snug", isAcknowledged && "line-through")}>
            {insight.title}
          </p>
          {!expanded && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
              {insight.body}
            </p>
          )}
        </div>

        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-border/60 space-y-3 border-t px-4 pb-4 pt-3">
              <p className="text-muted-foreground text-sm leading-relaxed">{insight.body}</p>

              {/* Affected providers */}
              {insight.affectedProviders.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {insight.affectedProviders.map((provider) => (
                    <ProviderBadge key={provider} provider={provider} size="xs" />
                  ))}
                </div>
              )}

              {/* Recommended action */}
              {insight.recommendedAction && (
                <div className="bg-primary/5 border-primary/20 rounded-lg border p-3">
                  <div className="text-primary mb-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Recommended Action
                  </div>
                  <p className="text-foreground text-xs leading-relaxed">
                    {insight.recommendedAction}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ConfidenceBadge confidence={insight.confidence} />
                  {insight.evidence && (
                    <EvidenceViewer evidence={insight.evidence} />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isAcknowledged && onAcknowledge && (
                    <button
                      type="button"
                      onClick={handleAcknowledge}
                      disabled={pending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                        "border-border border bg-transparent text-muted-foreground",
                        "hover:bg-secondary hover:text-foreground",
                        "disabled:opacity-40",
                      )}
                    >
                      <Check className="h-3 w-3" />
                      {pending ? "Dismissing…" : "Dismiss"}
                    </button>
                  )}
                  {isAcknowledged && (
                    <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <Check className="h-3 w-3" />
                      Acknowledged{" "}
                      {new Date(insight.acknowledgedAt ?? "").toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
