"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  LineChart,
  Swords,
  FileBarChart,
  Settings,
  Command,
  Globe,
  Brain,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NavChild = { href: string; label: string };
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/crawls", label: "Crawls", icon: Globe },
  {
    href: "/ai-visibility",
    label: "AI Visibility",
    icon: Sparkles,
    children: [
      { href: "/ai-visibility/prompts", label: "Prompts" },
      { href: "/ai-visibility/scans", label: "Scan Results" },
    ],
  },
  {
    href: "/intelligence",
    label: "Intelligence",
    icon: Brain,
    children: [
      { href: "/intelligence/insights", label: "Insights" },
      { href: "/intelligence/competitors", label: "Competitors" },
      { href: "/intelligence/citations", label: "Citations" },
      { href: "/intelligence/recommendations", label: "Recommendations" },
    ],
  },
  { href: "/seo-analytics", label: "SEO Analytics", icon: LineChart },
  { href: "/competitors", label: "Competitors", icon: Swords },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ basePath = "" }: Readonly<{ basePath?: string }>) {
  const pathname = usePathname();
  return (
    <aside className="bg-card border-border hidden h-screen w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-md">
          <Command className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">AIV</span>
        <span className="text-muted-foreground ml-auto text-[10px] uppercase tracking-wider">
          Enterprise
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-2">
        <div className="text-muted-foreground px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider">
          Workspace
        </div>
        {NAV.map(({ href, label, icon: Icon, children }) => {
          const full = `${basePath}${href}`;
          const active =
            pathname === full ||
            (pathname?.startsWith(`${full}/`) &&
              !children?.some((c) => pathname?.startsWith(`${basePath}${c.href}`)));
          const sectionActive = pathname?.startsWith(`${full}`);
          return (
            <div key={href}>
              <Link
                href={full}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {label}
              </Link>
              {children && sectionActive && (
                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
                  {children.map((child) => {
                    const childFull = `${basePath}${child.href}`;
                    const childActive =
                      pathname === childFull || pathname?.startsWith(`${childFull}/`);
                    return (
                      <Link
                        key={child.href}
                        href={childFull}
                        className={cn(
                          "flex items-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          childActive
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-border border-t p-3">
        <div className="bg-secondary/60 rounded-md p-3">
          <div className="text-foreground text-xs font-medium">Pro plan</div>
          <div className="text-muted-foreground mt-0.5 text-[11px]">
            12,430 / 50,000 AI queries used
          </div>
          <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
            <div
              className="bg-foreground h-full rounded-full"
              style={{ width: "24.86%" }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
