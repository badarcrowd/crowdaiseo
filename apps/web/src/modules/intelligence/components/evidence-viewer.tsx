"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { EvidenceBundle } from "@/modules/executive-insights/domain/types";

type Props = {
  evidence: EvidenceBundle;
  className?: string;
};

export function EvidenceViewer({ evidence, className }: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  if (!evidence.items.length) return null;

  return (
    <div className={cn("", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
      >
        <Info className="h-3 w-3" />
        <span>
          {evidence.dataPoints} data points · {evidence.windowDays}d window
        </span>
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="border-border bg-muted/40 mt-2 rounded-lg border p-3">
          <div className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
            Supporting Evidence
            {evidence.comparedTo && (
              <span className="ml-2 normal-case">vs {evidence.comparedTo.replace(/_/g, " ")}</span>
            )}
          </div>
          <div className="space-y-1.5">
            {evidence.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span
                  className={cn(
                    "text-xs",
                    item.highlight ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground tabular-nums text-xs font-medium">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                  </span>
                  {item.delta !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        item.delta > 0 ? "text-success" : item.delta < 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {item.delta > 0 ? "+" : ""}
                      {item.delta.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
