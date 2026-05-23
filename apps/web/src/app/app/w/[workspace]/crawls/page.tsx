import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";

export default async function CrawlsIndexPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const crawls = await prisma.crawl.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { project: { select: { name: true, domain: true } } },
  });

  return (
    <>
      <PageHeader
        title="Crawls"
        description="Every site crawl run by AIV."
      />
      <PageContent>
        {crawls.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-12 text-center text-sm">
              No crawls yet. Trigger a crawl from any project.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Root URL</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Progress</th>
                    <th className="px-3 py-2 font-medium">Pages</th>
                    <th className="px-3 py-2 font-medium">Issues</th>
                    <th className="px-3 py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {crawls.map((c) => (
                    <tr
                      key={c.id}
                      className="border-border hover:bg-secondary/40 border-b transition-colors last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/w/${slug}/crawls/${c.id}`}
                          className="text-foreground font-medium hover:underline"
                        >
                          {c.project.name}
                        </Link>
                        <div className="text-muted-foreground font-mono text-xs">
                          {c.project.domain}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-xs truncate font-mono text-xs">
                        {c.rootUrl}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            c.status === "COMPLETED"
                              ? "success"
                              : c.status === "FAILED"
                                ? "destructive"
                                : c.status === "CANCELLED"
                                  ? "outline"
                                  : "info"
                          }
                        >
                          {c.status[0] + c.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {c.pagesFound > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="bg-secondary h-2 w-24 overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{
                                  width: `${Math.min(100, (c.pagesCrawled / c.pagesFound) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {Math.round((c.pagesCrawled / c.pagesFound) * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {c.pagesCrawled.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {c.issuesFound > 0 ? (
                          <Badge variant="warning">{c.issuesFound}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {c.startedAt
                          ? new Date(c.startedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}
