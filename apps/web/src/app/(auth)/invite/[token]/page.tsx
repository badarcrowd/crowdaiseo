import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { AcceptInviteButton } from "./accept-button";

export default async function InvitePage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const user = await getCurrentUser();

  // Preserve invite intent through sign-in.
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true, slug: true } } },
  });

  if (!invite) {
    return <InviteError message="This invite link is invalid." />;
  }
  if (invite.acceptedAt) {
    return <InviteError message="This invite has already been accepted." />;
  }
  if (invite.revokedAt) {
    return <InviteError message="This invite has been revoked." />;
  }
  if (invite.expiresAt < new Date()) {
    return <InviteError message="This invite has expired." />;
  }
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <InviteError
        message={`This invite is for ${invite.email}, but you are signed in as ${user.email}.`}
      />
    );
  }

  return (
    <section className="bg-card rounded-lg border p-8">
      <h1 className="text-2xl font-semibold">Join {invite.workspace.name}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        You&apos;ve been invited to join <strong>{invite.workspace.name}</strong> as{" "}
        <strong>{invite.role.toLowerCase()}</strong>.
      </p>
      <div className="mt-6">
        <AcceptInviteButton token={token} workspaceSlug={invite.workspace.slug} />
      </div>
    </section>
  );
}

function InviteError({ message }: Readonly<{ message: string }>) {
  return (
    <section className="bg-card rounded-lg border p-8">
      <h1 className="text-2xl font-semibold">Invite unavailable</h1>
      <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      <Link
        href="/app"
        className="text-foreground mt-4 inline-block text-sm underline"
      >
        Go to dashboard
      </Link>
    </section>
  );
}
