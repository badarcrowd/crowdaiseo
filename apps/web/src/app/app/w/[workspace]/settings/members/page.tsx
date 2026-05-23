import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { InviteForm } from "@/modules/workspaces/presentation/invite-form";
import { MembersTable } from "@/modules/workspaces/presentation/members-table";
import { PendingInvitesTable } from "@/modules/workspaces/presentation/pending-invites-table";

export default async function MembersSettingsPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();

  const { user, member } = await requireMembership(ws.id);
  const isAdmin = member.role === "OWNER" || member.role === "ADMIN";

  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ws.id },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    isAdmin
      ? prisma.workspaceInvite.findMany({
          where: { workspaceId: ws.id, acceptedAt: null, revokedAt: null },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground text-sm">
          Manage who can access {ws.name}.
        </p>
      </header>

      {isAdmin && (
        <section className="bg-card space-y-3 rounded-lg border p-6">
          <h2 className="text-sm font-medium">Invite teammate</h2>
          <InviteForm workspaceId={ws.id} />
        </section>
      )}

      <section className="bg-card rounded-lg border p-6">
        <h2 className="mb-3 text-sm font-medium">Team ({members.length})</h2>
        <MembersTable
          workspaceId={ws.id}
          currentUserId={user.id}
          currentUserRole={member.role}
          members={members.map((m) => ({
            userId: m.userId,
            email: m.user.email,
            fullName: m.user.fullName,
            role: m.role,
          }))}
        />
      </section>

      {isAdmin && invites.length > 0 && (
        <section className="bg-card rounded-lg border p-6">
          <h2 className="mb-3 text-sm font-medium">Pending invites</h2>
          <PendingInvitesTable
            workspaceId={ws.id}
            invites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        </section>
      )}
    </div>
  );
}
