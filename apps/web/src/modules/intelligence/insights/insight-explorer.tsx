"use client";

import { useState, useMemo } from "react";
import { Search, Filter, LayoutList, Clock, Grid3X3, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { InsightCard } from "../components/insight-card";
import { SeverityBadge } from "../components/severity-badge";
import { acknowledgeInsightAction } from "@/modules/executive-insights/presentation/actions";
import type { InsightListItem } from "../queries";

type InsightSeverity = "CRITICAL" | "ATTENTION" | "INFO";
type View = "list" | "timeline" | "heatmap";
type GroupBy = "none" | "kind" | "severity" | "provider";

const SEVERITY_ORDER: InsightSeverity[] = ["CRITICAL", "ATTENTION", "INFO"];

const KIND_GROUPS: Record<string, string[]> = {
  Alerts: ["STRATEGIC_ALERT", "COMPETITOR_NEW_ENTRANT"],
  Threats: ["COMPETITIVE_THREAT", "COMPETITOR_DOMINANCE", "SENTIMENT_SHIFT"],
  Opportunities: [
    "GROWTH_OPPORTUNITY",
    "CITATION_OPPORTUNITY",
    "CITATION_AUTHORITY_GAP",
    "AI_PERCEPTION_POSITIVE",
    "BRAND_TRUST_SIGNAL",
    "PROVIDER_RECOMMENDATION",
  ],
  Diagnostics: ["CATEGORY_WEAK_SPOT", "AI_PERCEPTION_NEGATIVE"],
  Summaries: ["EXECUTIVE_WEEKLY_SUMMARY"],
};

function severityLabel(s: InsightSeverity): string {
  if (s === "CRITICAL") return "Critical";
  if (s === "ATTENTION") return "Attention";
  return "Info";
}

function heatmapColor(v: { critical: number; attention: number; info: number }, intensity: number) {
  if (v.critical > 0) return `hsl(var(--destructive) / ${0.15 + intensity * 0.7})`;
  if (v.attention > 0) return `hsl(var(--warning) / ${0.15 + intensity * 0.7})`;
  const total = v.critical + v.attention + v.info;
  if (total > 0) return `hsl(var(--info) / ${0.15 + intensity * 0.6})`;
  return "hsl(var(--muted))";
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function InsightHeatmap({ insights }: Readonly<{ insights: InsightListItem[] }>) {
  const cells = useMemo(() => {
    const map = new Map<string, { critical: number; attention: number; info: number }>();
    for (const ins of insights) {
      const day = ins.forDay.slice(0, 10);
      const slot = map.get(day) ?? { critical: 0, attention: 0, info: 0 };
      if (ins.severity === "CRITICAL") slot.critical++;
      else if (ins.severity === "ATTENTION") slot.attention++;
      else slot.info++;
      map.set(day, slot);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  }, [insights]);

  const max = Math.max(...cells.map(([, v]) => v.critical + v.attention + v.info), 1);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {cells.map(([day, v]) => {
          const total = v.critical + v.attention + v.info;
          const intensity = total / max;
          return (
            <div
              key={day}
              className="flex h-7 w-7 cursor-default items-center justify-center rounded-md text-[9px] tabular-nums font-medium"
              style={{
                background: heatmapColor(v, intensity),
                color: intensity > 0.5 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              }}
              title={`${new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${total} insights`}
            >
              {total > 0 ? total : ""}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-destructive/60" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-warning/60" /> Attention
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-info/60" /> Info
        </span>
      </div>
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

function InsightTimeline({ insights }: Readonly<{ insights: InsightListItem[] }>) {
  const byDay = useMemo(() => {
    const m = new Map<string, InsightListItem[]>();
    for (const ins of insights) {
      const day = ins.forDay.slice(0, 10);
      const list = m.get(day) ?? [];
      list.push(ins);
      m.set(day, list);
    }
    return [...m.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 10);
  }, [insights]);

  return (
    <div className="relative space-y-6 pl-6">
      <div className="border-border absolute left-2 top-0 h-full w-px border-l border-dashed" />
      {byDay.map(([day, items]) => (
        <div key={day}>
          <div className="border-border bg-background absolute left-0 flex h-4 w-4 items-center justify-center rounded-full border">
            <div className="bg-foreground h-1.5 w-1.5 rounded-full" />
          </div>
          <div className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
            {new Date(day).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="space-y-2">
            {items.slice(0, 3).map((ins) => (
              <div key={ins.id} className="border-border bg-card rounded-lg border p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <SeverityBadge severity={ins.severity} />
                </div>
                <p className="text-sm font-medium leading-snug">{ins.title}</p>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-muted-foreground text-xs">
                +{items.length - 3} more insights
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Explorer ────────────────────────────────────────────────────────────

type Props = {
  insights: InsightListItem[];
  workspaceId: string;
  initialFilter?: string;
};

export function InsightExplorer({ insights, workspaceId, initialFilter }: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("severity");
  const [severityFilter, setSeverityFilter] = useState<InsightSeverity | "ALL">(
    initialFilter === "critical" ? "CRITICAL" : "ALL",
  );
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const filtered = useMemo(() => {
    let items = insights;
    if (!showAcknowledged) items = items.filter((i) => !i.acknowledgedAt);
    if (severityFilter !== "ALL")
      items = items.filter((i) => i.severity === severityFilter);
    if (initialFilter === "opportunities")
      items = items.filter((i) => KIND_GROUPS.Opportunities?.includes(i.kind));
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.body.toLowerCase().includes(q) ||
          i.kind.toLowerCase().includes(q),
      );
    }
    return items;
  }, [insights, query, severityFilter, showAcknowledged, initialFilter]);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeInsightAction({ workspaceId, insightId: id });
  };

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ label: "All", items: filtered }];
    if (groupBy === "severity") {
      return SEVERITY_ORDER.filter((s) =>
        filtered.some((i) => i.severity === s),
      ).map((s) => ({
        label: severityLabel(s),
        severity: s,
        items: filtered.filter((i) => i.severity === s),
      }));
    }
    if (groupBy === "kind") {
      return Object.entries(KIND_GROUPS)
        .filter(([, kinds]) => filtered.some((i) => kinds.includes(i.kind)))
        .map(([label, kinds]) => ({
          label,
          items: filtered.filter((i) => kinds.includes(i.kind)),
        }));
    }
    return [{ label: "All", items: filtered }];
  }, [filtered, groupBy]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search insights…"
            className="border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {(["ALL", "CRITICAL", "ATTENTION", "INFO"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverityFilter(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                severityFilter === s
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="border-border bg-secondary/50 text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
          >
            <option value="none">No grouping</option>
            <option value="severity">By severity</option>
            <option value="kind">By category</option>
          </select>
        </div>

        {/* Views */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {([["list", LayoutList], ["timeline", Clock], ["heatmap", Grid3X3]] as const).map(
            ([v, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={v}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ),
          )}
        </div>

        {/* Show acknowledged toggle */}
        <button
          type="button"
          onClick={() => setShowAcknowledged((v) => !v)}
          className={cn(
            "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            showAcknowledged
              ? "border-border bg-secondary text-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {showAcknowledged ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {/* Count */}
      <div className="text-muted-foreground text-xs">
        {filtered.length} insight{filtered.length !== 1 ? "s" : ""}
        {query && ` matching "${query}"`}
      </div>

      {/* Content */}
      {view === "heatmap" && <InsightHeatmap insights={filtered} />}
      {view === "timeline" && <InsightTimeline insights={filtered} />}

      {view === "list" && (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              {groupBy !== "none" && (
                <div className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
                  {label} · {items.length}
                </div>
              )}
              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onAcknowledge={handleAcknowledge}
                      className="cursor-pointer"
                    />
                  ))}
                </AnimatePresence>
                {items.length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No insights in this group
                  </p>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No insights match your current filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
