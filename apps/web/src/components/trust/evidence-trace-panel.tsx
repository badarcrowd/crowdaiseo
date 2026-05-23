"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Database, Link2, Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import type { EvidenceTrace } from "@/modules/trust";

type Props = {
  trace: EvidenceTrace;
  className?: string;
};

function Section({
  icon: Icon,
  label,
  count,
  children,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40 text-left"
      >
        <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground text-xs font-medium flex-1">{label}</span>
        <Badge variant="info" className="h-4 px-1.5 text-[10px]">
          {count}
        </Badge>
        {open ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open && <div className="mt-1 px-2 pb-1">{children}</div>}
    </div>
  );
}

export function EvidenceTracePanel({ trace, className }: Props) {
  const topProviders = trace.contributingProviders.slice(0, 5);
  const topCitations = trace.contributingCitations.slice(0, 10);
  const topPrompts = trace.contributingPrompts
    .filter((p) => p.brandMentioned)
    .slice(0, 10);
  const baselineSnaps = trace.historicalSnapshots.filter((s) => s.usedAsBaseline);
  const currentSnaps = trace.historicalSnapshots.filter((s) => !s.usedAsBaseline);

  return (
    <div className={cn("space-y-1 rounded-lg border p-3", className)}>
      <div className="mb-2 flex items-center gap-2">
        <Database className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs">
          Evidence trace · {trace.totalRunsAnalyzed} runs · {trace.windowDays}d window
        </span>
      </div>

      <Section icon={Users} label="Provider contributions" count={topProviders.length}>
        <div className="space-y-1">
          {topProviders.map((p) => (
            <div key={p.provider} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-20 truncate font-mono text-[10px]">
                {p.provider}
              </span>
              <div className="flex-1 overflow-hidden">
                <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${Math.round(p.weight * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-muted-foreground w-10 text-right tabular-nums text-[10px]">
                {p.runsAnalyzed}r
              </span>
              <span className="text-muted-foreground w-12 text-right tabular-nums text-[10px]">
                {Math.round(p.mentionRate * 100)}% hit
              </span>
            </div>
          ))}
        </div>
      </Section>

      {topCitations.length > 0 && (
        <Section icon={Link2} label="Citation sources" count={topCitations.length}>
          <div className="space-y-1">
            {topCitations.map((c) => (
              <div key={c.domain} className="flex items-center gap-2 text-xs">
                <span className="text-foreground min-w-0 flex-1 truncate font-mono text-[10px]">
                  {c.domain}
                </span>
                <span className="text-muted-foreground tabular-nums text-[10px]">×{c.count}</span>
                <span className="text-muted-foreground tabular-nums text-[10px]">
                  auth {c.authorityScore}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {topPrompts.length > 0 && (
        <Section icon={Layers} label="Influential prompts" count={topPrompts.length}>
          <div className="space-y-1">
            {topPrompts.map((p, i) => (
              <div key={`${p.promptId}-${i}`} className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground w-20 truncate font-mono">{p.provider}</span>
                <span className="text-muted-foreground flex-1 truncate">{p.category}</span>
                {p.brandRank !== null && (
                  <span className="text-muted-foreground">rank {p.brandRank}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {trace.historicalSnapshots.length > 0 && (
        <Section icon={Database} label="Historical snapshots" count={trace.historicalSnapshots.length}>
          <div className="space-y-2">
            {baselineSnaps.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
                  Baseline
                </p>
                <div className="flex flex-wrap gap-1">
                  {baselineSnaps.map((s) => (
                    <span
                      key={s.day}
                      className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px] tabular-nums"
                    >
                      {s.day}: {s.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {currentSnaps.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
                  Current
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentSnaps.map((s) => (
                    <span
                      key={s.day}
                      className="bg-primary/10 text-primary rounded px-1 py-0.5 text-[10px] tabular-nums"
                    >
                      {s.day}: {s.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
