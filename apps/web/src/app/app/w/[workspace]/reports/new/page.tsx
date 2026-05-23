import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { CreateReportForm } from "@/modules/reports/presentation/create-report-form";

export default async function NewReportPage({
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
        title="New report"
        description="Choose a template and configure your report."
        actions={
          <Link
            href={`${basePath}/reports`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to reports
          </Link>
        }
      />
      <PageContent>
        <div className="max-w-3xl">
          <CreateReportForm
            workspaceId={ws.id}
            projects={projects}
            basePath={basePath}
          />
        </div>
      </PageContent>
    </>
  );
}
