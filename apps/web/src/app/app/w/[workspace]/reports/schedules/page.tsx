import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, FileText, Palette, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { reportQueries } from "@/modules/reports";
import { CreateScheduleForm } from "@/modules/reports/presentation/create-schedule-form";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const TEMPLATE_LABELS: Record<string, string> = {
  EXECUTIVE_SUMMARY: "Executive Summary",
  COMPETITOR_ANALYSIS: "Competitor Analysis",
  GEO_OPTIMIZATION: "GEO Optimization",
  AI_VISIBILITY_DEEP_DIVE: "AI Visibility Deep Dive",
  CITATION_AUTHORITY: "Citation Authority",
};

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -------------------------------------------------------------------------
// Sub-navigation (reused across report pages)
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
// Schedule list
// -------------------------------------------------------------------------

async function SchedulesList({ workspaceId }: { workspaceId: string }) {
  const schedules = await reportQueries.listSchedules(workspaceId);

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Calendar className="text-muted-foreground mb-3 h-8 w-8" />
        <p className="text-sm font-medium">No schedules yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Create a schedule below to automate report delivery.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-[11px] uppercase tracking-wider">
            <th className="px-5 py-3 font-medium">Schedule</th>
            <th className="px-3 py-3 font-medium">Template</th>
            <th className="px-3 py-3 font-medium">Frequency</th>
            <th className="hidden px-3 py-3 font-medium md:table-cell">Next run</th>
            <th className="hidden px-3 py-3 font-medium lg:table-cell">Last run</th>
            <th className="px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr
              key={s.id}
              className="border-b transition-colors last:border-0 hover:bg-secondary/40"
            >
              <td className="px-5 py-4">
                <div className="font-medium">{s.title}</div>
                {s.timezone !== "UTC" && (
                  <div className="text-muted-foreground text-xs">{s.timezone}</div>
                )}
              </td>
              <td className="px-3 py-4 text-xs text-muted-foreground">
                {TEMPLATE_LABELS[s.template] ?? s.template}
              </td>
              <td className="px-3 py-4">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {s.cron}
                </code>
              </td>
              <td className="hidden px-3 py-4 text-xs text-muted-foreground md:table-cell">
                {formatDate(s.nextRunAt)}
              </td>
              <td className="hidden px-3 py-4 text-xs text-muted-foreground lg:table-cell">
                {formatDate(s.lastRunAt)}
              </td>
              <td className="px-3 py-4">
                {s.active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="outline">Paused</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------
// Page
// -------------------------------------------------------------------------

export default async function SchedulesPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const projects = await prisma.project.findMany({
    where: { workspaceId: ws.id, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const basePath = `/app/w/${ws.slug}`;

  return (
    <>
      <PageHeader
        title="Report schedules"
        description="Recurring reports delivered on a cron schedule."
      />
      <PageContent className="space-y-6">
        <ReportsNav basePath={basePath} />

        {/* Existing schedules */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<SchedulesSkeleton />}>
              <SchedulesList workspaceId={ws.id} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Create new schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <CardTitle className="text-base">New schedule</CardTitle>
            </div>
            <CardDescription>
              Schedules run automatically. Recipients receive the PDF by email.
              Requires Admin role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateScheduleForm
              workspaceId={ws.id}
              projects={projects}
            />
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
