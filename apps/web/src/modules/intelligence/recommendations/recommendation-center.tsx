"use client";

import { useState } from "react";
import {
  LayoutGrid,
  GitBranch,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { RecommendationItem } from "../queries";
type RecommendationCategory = "CONTENT" | "TECHNICAL" | "AUTHORITY" | "AI_OPTIMIZATION";
type RecommendationDifficulty = "EASY" | "MEDIUM" | "HARD";

type View = "kanban" | "roadmap";

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  CONTENT: "Content",
  TECHNICAL: "Technical",
  AUTHORITY: "Authority",
  AI_OPTIMIZATION: "AI Optimization",
};

const CATEGORY_COLOR: Record<RecommendationCategory, string> = {
  CONTENT: "hsl(var(--chart-1))",
  TECHNICAL: "hsl(var(--chart-4))",
  AUTHORITY: "hsl(var(--chart-2))",
  AI_OPTIMIZATION: "hsl(var(--chart-3))",
};

const DIFFICULTY_CONFIG: Record<
  RecommendationDifficulty,
  { label: string; classes: string }
> = {
  EASY: { label: "Easy", classes: "bg-success/10 text-success" },
  MEDIUM: { label: "Medium", classes: "bg-warning/10 text-warning" },
  HARD: { label: "Hard", classes: "bg-destructive/10 text-destructive" },
};

const KANBAN_COLUMNS: { id: string; label: string; statuses: string[] }[] = [
  { id: "backlog", label: "Backlog", statuses: ["OPEN"] },
  { id: "in-progress", label: "In Progress", statuses: ["IN_PROGRESS"] },
  { id: "done", label: "Resolved", statuses: ["RESOLVED"] },
];

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({
  rec,
  compact = false,
}: Readonly<{
  rec: RecommendationItem;
  compact?: boolean;
}>) {
  const [expanded, setExpanded] = useState(false);
  const diffCfg = DIFFICULTY_CONFIG[rec.difficulty] ?? DIFFICULTY_CONFIG.EASY;
  const catColor = CATEGORY_COLOR[rec.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-border bg-card rounded-xl border transition-all hover:shadow-sm",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: catColor }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                background: `${catColor}22`,
                color: catColor,
              }}
            >
              {CATEGORY_LABEL[rec.category]}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-medium",
                diffCfg.classes,
              )}
            >
              {diffCfg.label}
            </span>
            {rec.status === "IN_PROGRESS" && (
              <span className="bg-info/10 text-info rounded-full px-2 py-0.5 text-[9px] font-medium">
                In Progress
              </span>
            )}
          </div>

          <p className={cn("font-medium leading-snug", compact ? "text-xs" : "text-sm")}>
            {rec.title}
          </p>

          {!compact && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed line-clamp-2">
              {rec.description}
            </p>
          )}

          {/* Impact + Priority meters */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="text-muted-foreground mb-0.5 text-[9px] uppercase tracking-wide">
                Impact
              </div>
              <div className="bg-muted h-1 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rec.impactScore}%`,
                    background: catColor,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5 text-[9px] uppercase tracking-wide">
                Priority
              </div>
              <div className="bg-muted h-1 overflow-hidden rounded-full">
                <div
                  className="bg-chart-3 h-full rounded-full"
                  style={{ width: `${rec.priorityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Expandable action */}
          {!compact && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-[10px] transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  expanded && "rotate-90",
                )}
              />
              {expanded ? "Hide action" : "View action"}
            </button>
          )}

          <AnimatePresence>
            {expanded && !compact && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-border bg-secondary/30 mt-2 rounded-lg border p-2.5">
                  <div className="text-muted-foreground mb-0.5 text-[9px] uppercase tracking-wide">
                    Action
                  </div>
                  <p className="text-foreground text-xs leading-relaxed">{rec.action}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ items }: Readonly<{ items: RecommendationItem[] }>) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {KANBAN_COLUMNS.map(({ id, label, statuses }) => {
        const colItems = items.filter((r) => statuses.includes(r.status));
        return (
          <div key={id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {id === "in-progress" && (
                  <Clock className="h-3.5 w-3.5 text-info" />
                )}
                {id === "done" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
                {id === "backlog" && (
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-muted-foreground bg-secondary rounded-full px-2 py-0.5 text-[10px] tabular-nums">
                {colItems.length}
              </span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {colItems.map((rec) => (
                  <RecCard key={rec.id} rec={rec} />
                ))}
              </AnimatePresence>
              {colItems.length === 0 && (
                <div className="border-border rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No items
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Roadmap View ─────────────────────────────────────────────────────────────

function RoadmapView({ items }: Readonly<{ items: RecommendationItem[] }>) {
  const categories = (
    ["AI_OPTIMIZATION", "CONTENT", "AUTHORITY", "TECHNICAL"] as RecommendationCategory[]
  ).filter((cat) => items.some((r) => r.category === cat));

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catItems = items
          .filter((r) => r.category === cat && r.status !== "RESOLVED")
          .sort((a, b) => b.priorityScore - a.priorityScore);
        if (catItems.length === 0) return null;
        const color = CATEGORY_COLOR[cat];

        return (
          <div key={cat}>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ background: color }}
              />
              <span className="text-sm font-semibold">{CATEGORY_LABEL[cat]}</span>
              <div
                className="flex-1 border-t"
                style={{ borderColor: `${color}44` }}
              />
              <span className="text-muted-foreground text-[10px]">
                {catItems.length} items
              </span>
            </div>
            <div className="relative">
              {/* Timeline axis */}
              <div
                className="absolute left-3 top-0 h-full w-px"
                style={{ background: `${color}33` }}
              />
              <div className="space-y-3 pl-8">
                {catItems.map((rec, i) => (
                  <div key={rec.id} className="relative">
                    <div
                      className="absolute -left-5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {i + 1}
                    </div>
                    <RecCard rec={rec} compact />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = {
  items: RecommendationItem[];
};

export function RecommendationCenter({ items }: Readonly<Props>) {
  const [view, setView] = useState<View>("kanban");
  const [filterCat, setFilterCat] = useState<RecommendationCategory | "ALL">("ALL");

  const categories = [
    ...new Set(items.map((r) => r.category)),
  ] as RecommendationCategory[];

  const filtered =
    filterCat === "ALL" ? items : items.filter((r) => r.category === filterCat);

  const openCount = items.filter((r) => r.status === "OPEN").length;
  const inProgressCount = items.filter((r) => r.status === "IN_PROGRESS").length;

  const handleExportCsv = () => {
    const rows = [
      "Category,Title,Difficulty,Impact,Priority,Status",
      ...items.map((r) =>
        [
          r.category,
          `"${r.title.replaceAll('"', '""')}"`,
          r.difficulty,
          r.impactScore,
          r.priorityScore,
          r.status,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recommendations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-chart-3/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <Zap className="text-chart-3 h-6 w-6" />
        </div>
        <p className="text-sm font-medium">No recommendations yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Run a GEO pipeline scan to generate strategic recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">{openCount}</span> open
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          <span className="text-info font-medium">{inProgressCount}</span> in progress
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">{items.length}</span> total
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {([["kanban", LayoutGrid], ["roadmap", GitBranch]] as const).map(
            ([v, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setFilterCat("ALL")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filterCat === "ALL"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filterCat === cat
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="border-border text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* View */}
      {view === "kanban" && <KanbanView items={filtered} />}
      {view === "roadmap" && <RoadmapView items={filtered} />}
    </div>
  );
}
