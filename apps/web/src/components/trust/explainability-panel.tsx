"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, HelpCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Explanation, ExplanationReason } from "@/modules/trust";

type Props = {
  explanation: Explanation;
  defaultOpen?: boolean;
  className?: string;
};

function ReasonRow({ reason }: { reason: ExplanationReason }) {
  const DirectionIcon =
    reason.direction === "positive"
      ? TrendingUp
      : reason.direction === "negative"
        ? TrendingDown
        : Minus;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <DirectionIcon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          reason.direction === "positive"
            ? "text-[hsl(var(--success))]"
            : reason.direction === "negative"
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <span className="text-foreground text-xs font-medium">{reason.label}</span>
        <span className="text-muted-foreground mx-1 text-xs">·</span>
        <span className="text-muted-foreground text-xs">{reason.detail}</span>
      </div>
      <span
        className={cn(
          "shrink-0 text-right text-xs font-medium tabular-nums",
          reason.direction === "positive"
            ? "text-[hsl(var(--success))]"
            : reason.direction === "negative"
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {reason.metric}
      </span>
    </div>
  );
}

export function ExplainabilityPanel({ explanation, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-muted/40"
      >
        <HelpCircle className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-xs font-medium">Why this result?</p>
          {!open && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {explanation.summary}
            </p>
          )}
        </div>
        <span className="shrink-0">
          {open ? (
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
            {explanation.summary}
          </p>
          <div className="divide-y divide-border/50">
            {explanation.reasons.map((reason, i) => (
              <ReasonRow key={`${reason.label}-${i}`} reason={reason} />
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-[10px]">
            All reasons are derived from measured data — no AI inference.
          </p>
        </div>
      )}
    </div>
  );
}
