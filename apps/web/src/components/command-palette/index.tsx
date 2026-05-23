"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  LayoutDashboard,
  Sparkles,
  Brain,
  Swords,
  Quote,
  Lightbulb,
  FileBarChart,
  Settings,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
};

type Props = {
  basePath: string;
};

export function CommandPalette({ basePath }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const navigate = useCallback(
    (path: string) => {
      router.push(`${basePath}${path}`);
      setOpen(false);
      setQuery("");
    },
    [basePath, router],
  );

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Main workspace overview",
      icon: LayoutDashboard,
      action: () => navigate("/dashboard"),
      shortcut: "G D",
    },
    {
      id: "intelligence",
      label: "Intelligence Center",
      description: "Executive AI intelligence dashboard",
      icon: Brain,
      action: () => navigate("/intelligence"),
      shortcut: "G I",
    },
    {
      id: "insights",
      label: "Insight Explorer",
      description: "Browse and filter all insights",
      icon: Lightbulb,
      action: () => navigate("/intelligence/insights"),
    },
    {
      id: "competitors",
      label: "Competitor Intelligence",
      description: "Share of voice and competitor analysis",
      icon: Swords,
      action: () => navigate("/intelligence/competitors"),
    },
    {
      id: "citations",
      label: "Citation Intelligence",
      description: "Citation authority and domain analysis",
      icon: Quote,
      action: () => navigate("/intelligence/citations"),
    },
    {
      id: "recommendations",
      label: "Strategic Recommendations",
      description: "GEO and AI optimization roadmap",
      icon: Lightbulb,
      action: () => navigate("/intelligence/recommendations"),
    },
    {
      id: "ai-visibility",
      label: "AI Visibility",
      description: "Track brand presence across LLMs",
      icon: Sparkles,
      action: () => navigate("/ai-visibility"),
    },
    {
      id: "reports",
      label: "Reports",
      description: "Generated reports and schedules",
      icon: FileBarChart,
      action: () => navigate("/reports"),
    },
    {
      id: "settings",
      label: "Settings",
      description: "Workspace configuration",
      icon: Settings,
      action: () => navigate("/settings"),
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((v) => Math.min(v + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selected]?.action();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-secondary/50 text-muted-foreground hover:bg-secondary flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="bg-background ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-muted-foreground rounded border border-border px-1.5 py-0.5 text-[10px] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={cmd.action}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  i === selected ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/50",
                )}
                onMouseEnter={() => setSelected(i)}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                    i === selected ? "border-border bg-background" : "border-transparent bg-secondary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{cmd.label}</div>
                  {cmd.description && (
                    <div className="text-muted-foreground text-xs">{cmd.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cmd.shortcut && (
                    <span className="text-muted-foreground text-[10px] font-mono">{cmd.shortcut}</span>
                  )}
                  {i === selected && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-2">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
