import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, FileText, Palette } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { reportRepository } from "@/modules/reports/infrastructure/report.repository";
import { WhiteLabelForm } from "@/modules/reports/presentation/white-label-form";

// -------------------------------------------------------------------------
// Sub-navigation
// -------------------------------------------------------------------------

function ReportsNav({ basePath }: { basePath: string }) {
  const links = [
    { href: `${basePath}/reports`, label: "Reports", icon: FileText },
    {
      href: `${basePath}/reports/schedules`,
      label: "Schedules",
      icon: Calendar,
    },
    {
      href: `${basePath}/reports/white-label`,
      label: "White-label",
      icon: Palette,
    },
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
// Page
// -------------------------------------------------------------------------

export default async function WhiteLabelPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const config = await reportRepository.getWhiteLabel(ws.id);
  const basePath = `/app/w/${ws.slug}`;

  return (
    <>
      <PageHeader
        title="White-label settings"
        description="Customize how your PDFs and share pages look to recipients."
      />
      <PageContent className="space-y-6">
        <ReportsNav basePath={basePath} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>
              Applied to all generated PDFs and public share viewer pages.
              Requires Admin role to update.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhiteLabelForm
              workspaceId={ws.id}
              initial={
                config
                  ? {
                      brandName: config.brandName,
                      logoUrl: config.logoUrl,
                      primaryColor: config.primaryColor,
                      accentColor: config.accentColor,
                      footerText: config.footerText,
                      shareDomain: config.shareDomain,
                    }
                  : null
              }
            />
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
