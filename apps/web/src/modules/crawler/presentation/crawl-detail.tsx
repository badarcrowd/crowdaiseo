"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IssueCategory, IssueSeverity } from "@prisma/client";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";

type Page = {
  id: string;
  url: string;
  status: string;
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  schemas: unknown;
  wordCount: number | null;
  durationMs: number | null;
  issuesCount: number;
};

type Issue = {
  id: string;
  pageId: string | null;
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  pageUrl?: string | null;
};

type Crawl = {
  id: string;
  status: string;
  rootUrl: string;
  startedAt: string | null;
  finishedAt: string | null;
  pagesCrawled: number;
  pagesFailed: number;
  pagesFound: number;
  issuesFound: number;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrls: string[];
  robotsContent: string | null;
};

const SEVERITY_ORDER: IssueSeverity[] = ["ERROR", "WARN", "INFO"];

const SEVERITY_META: Record<
  IssueSeverity,
  { label: string; className: string; icon: typeof AlertCircle }
> = {
  ERROR: {
    label: "Error",
    className: "text-destructive bg-destructive/10",
    icon: AlertCircle,
  },
  WARN: {
    label: "Warning",
    className: "text-warning bg-[hsl(var(--warning)/0.12)]",
    icon: AlertTriangle,
  },
  INFO: {
    label: "Info",
    className: "text-info bg-[hsl(var(--info)/0.12)]",
    icon: Info,
  },
};

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  ON_PAGE: "On-page",
  TECHNICAL: "Technical",
  CONTENT: "Content",
  STRUCTURED_DATA: "Structured data",
  PERFORMANCE: "Performance",
  ACCESSIBILITY: "Accessibility",
  INDEXABILITY: "Indexability",
};

export function CrawlDetail({
  crawl,
  pages,
  issues,
}: Readonly<{ crawl: Crawl; pages: Page[]; issues: Issue[] }>) {
  const router = useRouter();

  // Streaming refresh while crawl is in progress.
  useEffect(() => {
    if (crawl.status !== "RUNNING" && crawl.status !== "QUEUED") return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [crawl.status, router]);

  return (
    <div className="space-y-6">
      <CrawlSummary crawl={crawl} />
      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="assets">robots & sitemap</TabsTrigger>
        </TabsList>
        <TabsContent value="pages">
          <PagesTable pages={pages} />
        </TabsContent>
        <TabsContent value="issues">
          <IssuesPanel issues={issues} />
        </TabsContent>
        <TabsContent value="assets">
          <AssetsPanel crawl={crawl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------------------------------------------------------------

function CrawlSummary({ crawl }: Readonly<{ crawl: Crawl }>) {
  const router = useRouter();
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-5">
        <Stat label="Root URL" value={
          <a
            href={crawl.rootUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground inline-flex items-center gap-1 truncate font-mono text-xs"
          >
            {crawl.rootUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        } />
        <Stat label="Status" value={<StatusBadge status={crawl.status} />} />
        <Stat
          label="Pages crawled"
          value={
            <span className="tabular-nums">
              {crawl.pagesCrawled.toLocaleString()}
              <span className="text-muted-foreground ml-1 text-xs">
                / {crawl.pagesFound.toLocaleString()}
              </span>
            </span>
          }
        />
        <Stat
          label="Failures"
          value={
            <span
              className={cn(
                "tabular-nums",
                crawl.pagesFailed > 0 ? "text-destructive" : undefined,
              )}
            >
              {crawl.pagesFailed.toLocaleString()}
            </span>
          }
        />
        <div className="flex items-end justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </div>
      <div className="text-foreground mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  if (status === "COMPLETED") return <Badge variant="success">Completed</Badge>;
  if (status === "RUNNING" || status === "QUEUED")
    return <Badge variant="info">{status === "RUNNING" ? "Running" : "Queued"}</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

// ----------------------------------------------------------------------

function PagesTable({ pages }: Readonly<{ pages: Page[] }>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pages.filter((p) => {
      if (statusFilter === "ALL") {
        // pass
      } else if (statusFilter === "2xx") {
        if (!p.httpStatus || p.httpStatus < 200 || p.httpStatus >= 300) return false;
      } else if (statusFilter === "3xx") {
        if (!p.httpStatus || p.httpStatus < 300 || p.httpStatus >= 400) return false;
      } else if (statusFilter === "4xx") {
        if (!p.httpStatus || p.httpStatus < 400 || p.httpStatus >= 500) return false;
      } else if (statusFilter === "5xx") {
        if (!p.httpStatus || p.httpStatus < 500) return false;
      } else if (statusFilter === "ISSUES") {
        if (p.issuesCount === 0) return false;
      }
      if (q && !p.url.toLowerCase().includes(q) && !(p.title ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [pages, search, statusFilter]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URLs or titles…"
            className="w-72 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="2xx">2xx</SelectItem>
            <SelectItem value="3xx">3xx (redirects)</SelectItem>
            <SelectItem value="4xx">4xx (client errors)</SelectItem>
            <SelectItem value="5xx">5xx (server errors)</SelectItem>
            <SelectItem value="ISSUES">Pages with issues</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {filtered.length} of {pages.length} pages
        </span>
      </div>
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No pages match your filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                  <th className="w-6 px-3 py-2 font-medium" />
                  <th className="px-3 py-2 font-medium">URL</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Words</th>
                  <th className="px-3 py-2 font-medium">Latency</th>
                  <th className="px-3 py-2 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const open = expanded.has(p.id);
                  return (
                    <PageRowFragment
                      key={p.id}
                      page={p}
                      open={open}
                      onToggle={() => toggle(p.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageRowFragment({
  page,
  open,
  onToggle,
}: Readonly<{ page: Page; open: boolean; onToggle: () => void }>) {
  return (
    <>
      <tr
        className="border-border hover:bg-secondary/30 cursor-pointer border-b transition-colors"
        onClick={onToggle}
      >
        <td className="px-3 py-3">
          {open ? (
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          )}
        </td>
        <td className="max-w-md px-3 py-3">
          <div className="text-foreground truncate font-medium">
            {page.title ?? <span className="text-muted-foreground italic">(no title)</span>}
          </div>
          <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
            {page.url}
          </div>
        </td>
        <td className="px-3 py-3">
          <HttpBadge status={page.httpStatus} />
        </td>
        <td className="text-muted-foreground px-3 py-3 text-xs tabular-nums">
          {page.wordCount ?? "—"}
        </td>
        <td className="text-muted-foreground px-3 py-3 text-xs tabular-nums">
          {page.durationMs !== null ? `${page.durationMs} ms` : "—"}
        </td>
        <td className="px-3 py-3">
          {page.issuesCount > 0 ? (
            <Badge variant="warning">{page.issuesCount}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">0</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/30 border-border border-b">
          <td colSpan={6} className="p-0">
            <div className="grid gap-4 px-4 py-4 lg:grid-cols-3">
              <Section
                label="Meta"
                items={[
                  { k: "Title", v: page.title ?? "—" },
                  { k: "Description", v: page.metaDescription ?? "—" },
                  { k: "Status", v: page.status },
                ]}
              />
              <Section
                label="Headings"
                items={[
                  { k: "H1", v: page.h1.join(" · ") || "—" },
                  { k: "H2", v: page.h2.slice(0, 6).join(" · ") || "—" },
                  { k: "H3", v: page.h3.slice(0, 6).join(" · ") || "—" },
                ]}
              />
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Schema
                </div>
                <pre className="bg-card text-card-foreground border-border mt-1.5 max-h-40 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap">
                  {page.schemas
                    ? JSON.stringify(page.schemas, null, 2).slice(0, 2000)
                    : "(no JSON-LD)"}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Section({
  label,
  items,
}: Readonly<{ label: string; items: Array<{ k: string; v: string }> }>) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </div>
      <dl className="mt-1.5 space-y-1.5">
        {items.map((it) => (
          <div key={it.k}>
            <dt className="text-muted-foreground text-[10px] uppercase tracking-wider">
              {it.k}
            </dt>
            <dd className="text-foreground line-clamp-2 text-xs">{it.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HttpBadge({ status }: Readonly<{ status: number | null }>) {
  if (status === null) return <Badge variant="outline">—</Badge>;
  if (status >= 500) return <Badge variant="destructive">{status}</Badge>;
  if (status >= 400) return <Badge variant="destructive">{status}</Badge>;
  if (status >= 300) return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="success">{status}</Badge>;
}

// ----------------------------------------------------------------------

function IssuesPanel({ issues }: Readonly<{ issues: Issue[] }>) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"ALL" | IssueSeverity>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (severity !== "ALL" && i.severity !== severity) return false;
      if (
        q &&
        !i.message.toLowerCase().includes(q) &&
        !i.code.toLowerCase().includes(q) &&
        !(i.pageUrl ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [issues, search, severity]);

  const byCategory = useMemo(() => {
    const buckets = new Map<IssueCategory, Issue[]>();
    for (const i of filtered) {
      const list = buckets.get(i.category) ?? [];
      list.push(i);
      buckets.set(i.category, list);
    }
    return [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues…"
            className="w-72 pl-8"
          />
        </div>
        <Select value={severity} onValueChange={(v) => setSeverity(v as "ALL" | IssueSeverity)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All severities</SelectItem>
            {SEVERITY_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {SEVERITY_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {filtered.length} of {issues.length} issues
        </span>
      </div>
      {byCategory.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No issues match — your site is in good shape (for these filters).
          </CardContent>
        </Card>
      ) : (
        byCategory.map(([cat, list]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle>{CATEGORY_LABEL[cat]}</CardTitle>
              <CardDescription>
                {list.length} issue{list.length === 1 ? "" : "s"} ·{" "}
                {countBy(list, (i) => i.severity)
                  .map(([sev, count]) => `${count} ${SEVERITY_META[sev].label.toLowerCase()}`)
                  .join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-3 pt-0">
              {list.map((i) => {
                const meta = SEVERITY_META[i.severity];
                const Icon = meta.icon;
                return (
                  <div
                    key={i.id}
                    className="hover:bg-secondary/40 flex items-start gap-2.5 rounded-md px-2 py-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded",
                        meta.className,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {i.message}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {i.code}
                        </span>
                      </div>
                      {i.pageUrl && (
                        <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                          {i.pageUrl}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function AssetsPanel({ crawl }: Readonly<{ crawl: Crawl }>) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>robots.txt</CardTitle>
              <CardDescription>
                Crawl directives for user agents
              </CardDescription>
            </div>
            {crawl.hasRobotsTxt ? (
              <Badge variant="success">Found</Badge>
            ) : (
              <Badge variant="outline">Missing</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {crawl.robotsContent ? (
            <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
              {crawl.robotsContent}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">
              No robots.txt found. Search engines will use default behavior.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sitemaps</CardTitle>
              <CardDescription>
                XML sitemaps discovered during the crawl
              </CardDescription>
            </div>
            {crawl.hasSitemap ? (
              <Badge variant="success">Found ({crawl.sitemapUrls.length})</Badge>
            ) : (
              <Badge variant="outline">Missing</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {crawl.sitemapUrls.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No sitemap.xml was found. Consider adding one to help indexability.
            </p>
          ) : (
            <ul className="space-y-2">
              {crawl.sitemapUrls.map((url) => (
                <li key={url} className="flex items-center gap-2">
                  <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-foreground truncate font-mono text-xs underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const countBy = <T, K extends string>(
  arr: T[],
  key: (t: T) => K,
): Array<[K, number]> => {
  const map = new Map<K, number>();
  for (const it of arr) map.set(key(it), (map.get(key(it)) ?? 0) + 1);
  return [...map.entries()];
};
