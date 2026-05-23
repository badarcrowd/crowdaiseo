import { redirect } from "next/navigation";
import { resolveCurrentWorkspace } from "@/lib/auth/session";

/**
 * Resolves the user's last-active workspace and forwards. If none, send
 * to onboarding to create one.
 */
export default async function AppRootPage() {
  const ctx = await resolveCurrentWorkspace();
  if (!ctx) redirect("/app/onboarding");
  redirect(`/app/w/${ctx.workspace.slug}/dashboard`);
}
