import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reportQueries } from "@/modules/reports";
import { ShareTable } from "@/modules/reports/presentation/share-table";

const TEMPLATE_LABELS: Record<string, string> = {
  EXECUTIVE_SUMMARY: "Executive Summary",
  COMPETITOR_ANALYSIS: "Competitor Analysis",
  GEO_OPTIMIZATION: "GEO Optimization",
  AI_VISIBILITY_DEEP_DIVE: "AI Visibility Deep Dive",
  CITATION_AUTHORITY: "Citation Authority",
};

async function getShareBaseUrl() {
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }
}

export default async function ReportSharesPage({
  params,
}: Readonly<{
  params: Promise<{ workspace: string; reportId: string }>;
}>) {
  const { workspace: slug, reportId } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const report = await reportQueries.getReport(ws.id, reportId);
  if (!report) notFound();

  const shares = await reportQueries.listShares(ws.id, reportId);
  const shareBaseUrl = await getShareBaseUrl();

  const basePath = `/app/w/${ws.slug}`;
  const activeShares = shares.filter(
    (s) => !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt) > new Date()),
  );

  return (
    <>
      <PageHeader
        title="Share links"
        description={`Manage public access links for "${report.title}"`}
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
      <PageContent className="space-y-5">
        {/* Report summary */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">{report.title}</span>
          <Badge variant="outline">
            {TEMPLATE_LABELS[report.template] ?? report.template}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {activeShares.length} active link
            {activeShares.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Share links table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <CardTitle className="text-base">Active share links</CardTitle>
            </div>
            <CardDescription>
              Links are HMAC-signed and scoped to this report. Revoking
              permanently disables the link — it cannot be re-activated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShareTable
              shares={shares}
              workspaceId={ws.id}
              shareBaseUrl={shareBaseUrl}
            />
          </CardContent>
        </Card>

        {/* Download link for the PDF */}
        {report.status === "COMPLETED" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download PDF</CardTitle>
              <CardDescription>
                Signed URL valid for 5 minutes. Authenticated workspace members
                only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DownloadLink workspaceId={ws.id} reportId={reportId} />
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}

// Server-side signed download link
async function DownloadLink({
  workspaceId,
  reportId,
}: {
  workspaceId: string;
  reportId: string;
}) {
  const url = await reportQueries.signDownloadUrl(workspaceId, reportId);
  if (!url) return <p className="text-muted-foreground text-sm">Not available.</p>;
  return (
    <a
      href={url}
      download
      rel="noopener"
      className="inline-flex items-center gap-1.5 text-sm underline"
    >
      Download PDF
    </a>
  );
}
