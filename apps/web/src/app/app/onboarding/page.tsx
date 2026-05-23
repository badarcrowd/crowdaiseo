import { redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { workspaceRepository } from "@/modules/workspaces";
import { CreateWorkspaceForm } from "./create-workspace-form";

export default async function OnboardingPage() {
  const user = await requireUserOrRedirect();
  const workspaces = await workspaceRepository.listForUser(user.id);

  // If the user already has a workspace, send them to it. Onboarding is a
  // first-run flow only.
  if (workspaces.length > 0 && workspaces[0]) {
    redirect(`/app/w/${workspaces[0].slug}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="bg-card rounded-lg border p-8">
        <h1 className="text-2xl font-semibold">Create your workspace</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Workspaces hold your projects, members, and billing. You can create
          more later.
        </p>
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
