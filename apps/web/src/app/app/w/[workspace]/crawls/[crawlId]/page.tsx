import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { CrawlDetail } from "@/modules/crawler/presentation/crawl-detail";

export default async function CrawlDetailPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string; crawlId: string }> }>) {
  const { workspace: slug, crawlId } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const crawl = await prisma.crawl.findFirst({
    where: { id: crawlId, workspaceId: ws.id },
  });
  if (!crawl) notFound();

  const [pagesRaw, issuesRaw, robotsAsset] = await Promise.all([
    prisma.crawlPage.findMany({
      where: { crawlId },
      orderBy: { fetchedAt: "asc" },
      take: 500,
      include: { _count: { select: { issues: true } } },
    }),
    prisma.crawlIssue.findMany({
      where: { crawlId },
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
      take: 1000,
      include: { page: { select: { url: true } } },
    }),
    prisma.crawlAsset.findFirst({
      where: { crawlId, kind: "ROBOTS_TXT" },
      select: { content: true },
    }),
  ]);

  const pages = pagesRaw.map((p) => ({
    id: p.id,
    url: p.url,
    status: p.status,
    httpStatus: p.httpStatus,
    title: p.title,
    metaDescription: p.metaDescription,
    h1: p.h1,
    h2: p.h2,
    h3: p.h3,
    schemas: p.schemas,
    wordCount: p.wordCount,
    durationMs: p.durationMs,
    issuesCount: p._count.issues,
  }));

  const issues = issuesRaw.map((i) => ({
    id: i.id,
    pageId: i.pageId,
    code: i.code,
    severity: i.severity,
    category: i.category,
    message: i.message,
    pageUrl: i.page?.url ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Crawl"
        description={crawl.rootUrl}
      />
      <PageContent>
        <CrawlDetail
          crawl={{
            id: crawl.id,
            status: crawl.status,
            rootUrl: crawl.rootUrl,
            startedAt: crawl.startedAt?.toISOString() ?? null,
            finishedAt: crawl.finishedAt?.toISOString() ?? null,
            pagesCrawled: crawl.pagesCrawled,
            pagesFailed: crawl.pagesFailed,
            pagesFound: crawl.pagesFound,
            issuesFound: crawl.issuesFound,
            hasRobotsTxt: crawl.hasRobotsTxt,
            hasSitemap: crawl.hasSitemap,
            sitemapUrls: crawl.sitemapUrls,
            robotsContent: robotsAsset?.content ?? null,
          }}
          pages={pages}
          issues={issues}
        />
      </PageContent>
    </>
  );
}
