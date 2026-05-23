import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  Download,
  Share2,
  Calendar,
  Palette,
} from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { reportQueries } from "@/modules/reports";
import { RetryReportButton } from "@/modules/reports/presentation/retry-report-button";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const TEMPLATE_META: Record<
  string,
  { label: string; colorClass: string }
> = {
  EXECUTIVE_SUMMARY: {
    label: "Executive",
    colorClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  COMPETITOR_ANALYSIS: {
    label: "Competitor",
    colorClass:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  GEO_OPTIMIZATION: {
    label: "GEO",
    colorClass:
      "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  AI_VISIBILITY_DEEP_DIVE: {
    label: "AI Visibility",
    colorClass:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  CITATION_AUTHORITY: {
    label: "Citations",
    colorClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

function TemplateBadge({ template }: { template: string }) {
  const meta = TEMPLATE_META[template] ?? {
    label: template,
    colorClass: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED")
    return <Badge variant="success">Completed</Badge>;
  if (status === "RENDERING") return <Badge variant="info">Rendering…</Badge>;
  if (status === "QUEUED") return <Badge variant="outline">Queued</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge>{status}</Badge>;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// -------------------------------------------------------------------------
// Sub-navigation
// -------------------------------------------------------------------------

function ReportsNav({ basePath }: { basePath: string }) {
  const links = [
    { href: `${basePath}/reports`, label: "Reports", icon: FileText },
    { href: `${basePath}/reports/schedules`, label: "Schedules", icon: Calendar },
    { href: `${basePath}/reports/white-label`, label: "White-label", icon: Palette },
  ];
  return (
    <div className="flex gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <l.icon className="h-3.5 w-3.5" />
          {l.label}
        </Link>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------
// Stats
// -------------------------------------------------------------------------

async function ReportStats({ workspaceId }: { workspaceId: string }) {
  const [total, completed, failed] = await Promise.all([
    prisma.report.count({ where: { workspaceId } }),
    prisma.report.count({ where: { workspaceId, status: "COMPLETED" } }),
    prisma.report.count({ where: { workspaceId, status: "FAILED" } }),
  ]);
  const stats = [
    { label: "Total reports", value: total },
    { label: "Completed", value: completed },
    { label: "Failed", value: failed },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-5">
            <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              {s.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {s.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="pt-5 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------
// Reports table
// -------------------------------------------------------------------------

async function ReportsList({
  workspaceId,
  basePath,
}: {
  workspaceId: string;
  basePath: string;
}) {
  const reports = await reportQueries.listReports({ workspaceId, limit: 50 });

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No reports yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Generate your first report to get started.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href={`${basePath}/reports/new`}>
              <Plus className="h-3.5 w-3.5" /> New report
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[11px] uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Report</th>
              <th className="px-3 py-3 font-medium">Template</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="hidden px-3 py-3 font-medium tabular-nums md:table-cell">
                Size
              </th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">
                Created
              </th>
              <th className="px-5 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr
                key={r.id}
                className="border-b transition-colors last:border-0 hover:bg-secondary/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="max-w-[260px] truncate font-medium">
                        {r.title}
                      </div>
                      {r.error && (
                        <div className="text-destructive max-w-[260px] truncate text-xs">
                          {r.error}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <TemplateBadge template={r.template} />
                </td>
                <td className="px-3 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="text-muted-foreground hidden px-3 py-4 text-xs tabular-nums md:table-cell">
                  {formatBytes(r.pdfBytes) ?? "—"}
                </td>
                <td className="text-muted-foreground hidden px-3 py-4 text-xs lg:table-cell">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    {r.status === "COMPLETED" && (
                      <Link
                        href={`${basePath}/reports/${r.id}/download`}
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                        aria-label="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {r.status === "COMPLETED" && (
                      <Link
                        href={`${basePath}/reports/${r.id}/shares`}
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                        aria-label="Manage share links"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {r.status === "FAILED" && (
                      <RetryReportButton
                        reportId={r.id}
                        workspaceId={workspaceId}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-5 py-3">
          <Skeleton className="h-3 w-32" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-0">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-52" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Page
// -------------------------------------------------------------------------

export default async function ReportsPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const basePath = `/app/w/${ws.slug}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generated PDFs, schedules, and share links."
        actions={
          <Button asChild size="sm">
            <Link href={`${basePath}/reports/new`}>
              <Plus className="h-3.5 w-3.5" /> New report
            </Link>
          </Button>
        }
      />
      <PageContent className="space-y-5">
        <ReportsNav basePath={basePath} />
        <Suspense fallback={<StatsSkeleton />}>
          <ReportStats workspaceId={ws.id} />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <ReportsList workspaceId={ws.id} basePath={basePath} />
        </Suspense>
      </PageContent>
    </>
  );
}
