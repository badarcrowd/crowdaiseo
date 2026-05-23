import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { workspaceRepository } from "@/modules/workspaces";
import { TeamSwitcher } from "@/modules/workspaces/presentation/team-switcher";
import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectSelector } from "@/components/layout/project-selector";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";

export default async function WorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}>) {
  const { workspace: slug } = await params;
  if (!slug) notFound();

  const user = await requireUserOrRedirect();
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } },
  });
  if (!member) redirect("/app");

  await workspaceRepository.setLastWorkspace(user.id, ws.id).catch(() => null);

  const [workspaces, projects, selectedProjectId] = await Promise.all([
    workspaceRepository.listForUser(user.id),
    prisma.project.findMany({
      where: { workspaceId: ws.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, domain: true },
    }),
    getSelectedProjectId(ws.id),
  ]);

  // Auto-select the most recent project if no cookie is set yet
  const resolvedProjectId =
    selectedProjectId ??
    projects.find((p) => p.id === selectedProjectId)?.id ??
    projects[0]?.id ??
    null;

  return (
    <AppShell
      basePath={`/app/w/${ws.slug}`}
      workspaceName={ws.name}
      workspaceSlug={ws.slug}
      userName={user.user_metadata?.full_name ?? user.email ?? "User"}
      topbarExtras={
        <>
          {projects.length > 0 && (
            <ProjectSelector
              projects={projects}
              selectedProjectId={resolvedProjectId}
              workspaceId={ws.id}
              workspaceSlug={ws.slug}
            />
          )}
          <TeamSwitcher
            current={{ id: ws.id, slug: ws.slug, name: ws.name }}
            workspaces={workspaces.map((w) => ({
              id: w.id,
              slug: w.slug,
              name: w.name,
            }))}
          />
          <SignOutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
