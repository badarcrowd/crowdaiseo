"use client";

import { Bell, Search, ChevronsUpDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  workspaceName = "Acme, Inc.",
  workspaceSlug = "acme",
  userName = "Alex Chen",
  extras,
}: Readonly<{
  workspaceName?: string;
  workspaceSlug?: string;
  userName?: string;
  extras?: React.ReactNode;
}>) {
  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
      <button
        type="button"
        className="hover:bg-secondary -ml-1.5 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors"
      >
        <div className="bg-foreground text-background flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold">
          {workspaceName[0]}
        </div>
        <span className="font-medium">{workspaceName}</span>
        <Badge variant="outline" className="hidden text-[10px] md:inline-flex">
          {workspaceSlug}
        </Badge>
        <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5" />
      </button>

      <div className="relative ml-2 hidden flex-1 max-w-md md:block">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          placeholder="Search keywords, prompts, competitors…"
          className="border-input bg-muted/40 focus-visible:bg-background focus-visible:ring-ring h-8 w-full rounded-md border pl-8 pr-12 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
        />
        <kbd className="border-border bg-background text-muted-foreground absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center rounded border px-1.5 py-0.5 text-[10px] md:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {extras}
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="hover:bg-secondary text-muted-foreground hover:text-foreground relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="bg-destructive absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" />
        </button>
        <button
          type="button"
          className="hover:bg-secondary inline-flex items-center gap-2 rounded-md p-1 pr-2 transition-colors"
        >
          <Avatar name={userName} />
          <span className="hidden text-sm font-medium md:inline">{userName}</span>
        </button>
      </div>
    </header>
  );
}
